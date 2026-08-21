import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeCarReport } from "./parser.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DIR = join(ROOT, "public");
const PORT = Number(process.env.PORT || 3000);
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 2 * 1024 * 1024);
const APP_USERNAME = process.env.APP_USERNAME || "admin";
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const SESSION_SECRET = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const loginAttempts = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function securityHeaders(response) {
  response.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function sendJson(response, status, data, headers = {}) {
  securityHeaders(response);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  response.end(JSON.stringify(data));
}

function readBody(request, limit = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let exceeded = false;
    request.on("data", (chunk) => {
      if (exceeded) return;
      size += chunk.length;
      if (size > limit) {
        exceeded = true;
        reject(Object.assign(new Error(`Upload exceeds the ${Math.round(limit / 1024 / 1024)} MB limit.`), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (!exceeded) resolve(Buffer.concat(chunks));
    });
    request.on("error", reject);
  });
}

function parseCookies(request) {
  return Object.fromEntries(
    (request.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return separator > 0
          ? [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))]
          : [part, ""];
      })
  );
}

function sign(value) {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function createSession() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${APP_USERNAME}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function validSession(request) {
  if (!APP_PASSWORD) return true;
  const token = parseCookies(request).call_reader_session;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [username, expiresText, suppliedSignature] = parts;
  const payload = `${username}.${expiresText}`;
  const expectedSignature = sign(payload);
  if (username !== APP_USERNAME || Number(expiresText) < Math.floor(Date.now() / 1000)) return false;
  if (suppliedSignature.length !== expectedSignature.length) return false;
  return timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature));
}

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function clientKey(request) {
  return request.socket.remoteAddress || "unknown";
}

function loginAllowed(request) {
  const key = clientKey(request);
  const now = Date.now();
  const recent = (loginAttempts.get(key) || []).filter((timestamp) => now - timestamp < 15 * 60 * 1000);
  loginAttempts.set(key, recent);
  return recent.length < 5;
}

function recordFailedLogin(request) {
  const key = clientKey(request);
  loginAttempts.set(key, [...(loginAttempts.get(key) || []), Date.now()]);
}

async function handleLogin(request, response) {
  if (!APP_PASSWORD) return sendJson(response, 200, { authenticated: true });
  if (!loginAllowed(request)) return sendJson(response, 429, { error: "Too many login attempts. Try again in 15 minutes." });

  const body = await readBody(request, 16 * 1024);
  let credentials;
  try {
    credentials = JSON.parse(body.toString("utf8"));
  } catch {
    return sendJson(response, 400, { error: "Invalid login request." });
  }

  const valid = secureEqual(credentials.username || "", APP_USERNAME)
    && secureEqual(credentials.password || "", APP_PASSWORD);
  if (!valid) {
    recordFailedLogin(request);
    return sendJson(response, 401, { error: "Incorrect username or password." });
  }

  loginAttempts.delete(clientKey(request));
  return sendJson(response, 200, { authenticated: true }, {
    "Set-Cookie": `call_reader_session=${encodeURIComponent(createSession())}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`
  });
}

async function handleDecode(request, response) {
  if (!validSession(request)) return sendJson(response, 401, { error: "Please sign in before decoding a report." });
  const contentType = request.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("text/plain")) {
    return sendJson(response, 415, { error: "Upload the original report as a plain-text file." });
  }

  const body = await readBody(request);
  const filenameHeader = request.headers["x-report-filename"];
  const filename = typeof filenameHeader === "string"
    ? filenameHeader.replace(/[\r\n]/g, "").slice(0, 255)
    : "uploaded report";
  const decoded = decodeCarReport(body.toString("utf8"), filename);
  return sendJson(response, 200, decoded);
}

function serveStatic(pathname, response) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    return sendJson(response, 404, { error: "Not found" });
  }

  securityHeaders(response);
  response.writeHead(200, {
    "Content-Type": MIME_TYPES[extname(filePath)] || "application/octet-stream",
    "Cache-Control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=3600"
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return sendJson(response, 200, { status: "ok" });
    }
    if (request.method === "GET" && url.pathname === "/api/session") {
      return sendJson(response, 200, {
        authRequired: Boolean(APP_PASSWORD),
        authenticated: validSession(request),
        username: validSession(request) ? APP_USERNAME : null,
        maxUploadBytes: MAX_UPLOAD_BYTES
      });
    }
    if (request.method === "POST" && url.pathname === "/api/login") {
      return await handleLogin(request, response);
    }
    if (request.method === "POST" && url.pathname === "/api/logout") {
      return sendJson(response, 200, { authenticated: false }, {
        "Set-Cookie": "call_reader_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
      });
    }
    if (request.method === "POST" && url.pathname === "/api/decode") {
      return await handleDecode(request, response);
    }
    if (request.method === "GET" || request.method === "HEAD") {
      return serveStatic(url.pathname, response);
    }

    return sendJson(response, 405, { error: "Method not allowed" }, { Allow: "GET, HEAD, POST" });
  } catch (error) {
    const status = error.statusCode || (error.message?.includes("supported Cisco") ? 422 : 500);
    if (status >= 500) console.error(error);
    if (!response.headersSent) {
      return sendJson(response, status, { error: status >= 500 ? "The report could not be decoded." : error.message });
    }
    response.end();
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Call Log Reader listening on port ${PORT}`);
  console.log(APP_PASSWORD ? "Login protection is enabled." : "Warning: login protection is disabled.");
});
