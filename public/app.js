const elements = {
  uploadView: document.querySelector("#uploadView"),
  loadingView: document.querySelector("#loadingView"),
  resultsView: document.querySelector("#resultsView"),
  dropZone: document.querySelector("#dropZone"),
  fileInput: document.querySelector("#fileInput"),
  newReportButton: document.querySelector("#newReportButton"),
  exportButton: document.querySelector("#exportButton"),
  redactionToggle: document.querySelector("#redactionToggle"),
  reportTitle: document.querySelector("#reportTitle"),
  reportMeta: document.querySelector("#reportMeta"),
  summaryGrid: document.querySelector("#summaryGrid"),
  overallNotice: document.querySelector("#overallNotice"),
  callCount: document.querySelector("#callCount"),
  callsList: document.querySelector("#callsList"),
  toast: document.querySelector("#toast"),
  loginOverlay: document.querySelector("#loginOverlay"),
  loginForm: document.querySelector("#loginForm"),
  loginError: document.querySelector("#loginError"),
  logoutButton: document.querySelector("#logoutButton")
};

let decodedReport = null;
let selectedFile = null;

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  window.setTimeout(() => elements.toast.classList.add("hidden"), 5000);
}

function setView(name) {
  elements.uploadView.classList.toggle("hidden", name !== "upload");
  elements.loadingView.classList.toggle("hidden", name !== "loading");
  elements.resultsView.classList.toggle("hidden", name !== "results");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function maskNumber(value) {
  const text = String(value || "");
  const digits = text.replace(/\D/g, "");
  if (digits.length < 5) return text ? "••••" : "—";
  return `•••-•••-${digits.slice(-4)}`;
}

function maskIp(value) {
  const text = String(value || "");
  if (!text) return "—";
  const parts = text.split(".");
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.x.x` : "••••••";
}

function maskIdentity(value) {
  const text = String(value || "");
  if (!text) return "—";
  if (text.includes("@")) return `${text[0]}•••@••••`;
  return `${text.slice(0, 2)}••••`;
}

function display(value, kind = "text") {
  if (!elements.redactionToggle.checked) return value || "—";
  if (kind === "number") return maskNumber(value);
  if (kind === "ip") return maskIp(value);
  if (kind === "identity" || kind === "device") return maskIdentity(value);
  return value || "—";
}

function formatTime(value) {
  if (!value) return "Not connected";
  const match = value.match(/^(\w+ \d{1,2}, \d{4}) (.+)$/);
  return match ? match[2] : value;
}

function destinationLabel(type) {
  return ({ voicemail: "Voicemail", paging: "Paging destination", gateway: "Gateway", endpoint: "Destination" })[type] || "Destination";
}

function summaryCard(label, value, suffix = "") {
  return `<div class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${suffix ? `<em>${escapeHtml(suffix)}</em>` : ""}</div>`;
}

function renderSummary(summary) {
  elements.summaryGrid.innerHTML = [
    summaryCard("Calls found", summary.totalCalls),
    summaryCard("Connected", summary.connectedCalls),
    summaryCard("Forwarded", summary.forwardedCalls),
    summaryCard("Reached voicemail", summary.voicemailCalls),
    summaryCard("Average ring", summary.averageRingSeconds ?? "—", summary.averageRingSeconds === null ? "" : " seconds")
  ].join("");

  const warning = summary.qualityWarnings > 0;
  elements.overallNotice.classList.toggle("warning", warning);
  elements.overallNotice.innerHTML = warning
    ? `<span>⚠</span><strong>${summary.qualityWarnings} call${summary.qualityWarnings === 1 ? "" : "s"} contain endpoint quality metrics worth reviewing.</strong>`
    : `<span>✓</span><strong>Every completed call ended with a normal clearing code, and no quality warnings were detected.</strong>`;
}

function flowNode(label, number, device, kind = "number", extraClass = "") {
  return `<div class="flow-node ${extraClass}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(display(number, kind))}</strong><small>${escapeHtml(display(device, "device"))}</small></div>`;
}

function detail(label, value, kind = "text") {
  return `<div class="detail"><span>${escapeHtml(label)}</span><strong title="${escapeHtml(display(value, kind))}">${escapeHtml(display(value, kind))}</strong></div>`;
}

function metric(label, value, suffix = "") {
  const rendered = value === null || value === undefined || value === "" ? "—" : `${value}${suffix}`;
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(rendered)}</strong></div>`;
}

function redactedNarrative(call) {
  if (!elements.redactionToggle.checked) return call.narrative;
  let narrative = call.narrative;
  const sensitive = [
    call.caller.number,
    call.route.originalCalled,
    call.route.finalCalled,
    call.destination.number,
    call.caller.device,
    call.destination.device
  ].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const value of sensitive) {
    const masked = value.includes("+") || /^\d+$/.test(value) ? maskNumber(value) : maskIdentity(value);
    narrative = narrative.replaceAll(value, masked);
  }
  return narrative;
}

function renderQuality(quality) {
  if (!quality.available) {
    return `<details class="quality-panel"><summary>Voice quality · No endpoint metrics</summary><div class="quality-content"><p class="quality-notes">${escapeHtml(quality.notes[0])}</p></div></details>`;
  }

  return `<details class="quality-panel">
    <summary>Voice quality · ${escapeHtml(quality.label)}</summary>
    <div class="quality-content">
      ${metric("Codec", quality.codec)}
      ${metric("Packet loss", quality.packetsLost)}
      ${metric("Jitter", quality.jitterMs, " ms")}
      ${metric("Max jitter", quality.maxJitterMs, " ms")}
      ${metric("Latency", quality.latencyMs, " ms")}
      ${quality.notes.length ? `<ul class="quality-notes">${quality.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
    </div>
  </details>`;
}

function renderCall(call, index) {
  const hasRedirect = call.forwarding.forwarded;
  const qualityBadge = call.quality.status === "warning"
    ? `<span class="badge warning">Quality review</span>`
    : call.quality.status === "good"
      ? `<span class="badge good">Quality good</span>`
      : `<span class="badge">No quality data</span>`;

  const raw = elements.redactionToggle.checked
    ? "Sensitive fields are hidden while redaction is enabled."
    : JSON.stringify(call.raw, null, 2);

  return `<article class="call-card">
    <div class="call-top">
      <div class="call-label">
        <span class="call-number">${String(index + 1).padStart(2, "0")}</span>
        <div><h3>${escapeHtml(display(call.caller.number, "number"))} → ${escapeHtml(display(call.route.finalCalled, "number"))}</h3><small>${escapeHtml(call.type)} call · ${escapeHtml(call.id)}</small></div>
      </div>
      <div class="badges">
        <span class="badge ${call.outcome.normal ? "good" : "warning"}">${escapeHtml(call.outcome.label)}</span>
        ${hasRedirect ? `<span class="badge blue">${escapeHtml(call.forwarding.reason)}</span>` : ""}
        ${qualityBadge}
      </div>
    </div>

    <p class="narrative">${escapeHtml(redactedNarrative(call))}</p>

    <div class="call-flow">
      ${flowNode("Caller", call.caller.number, call.caller.device)}
      <span class="flow-arrow">→</span>
      ${flowNode(hasRedirect ? "Originally called" : destinationLabel(call.route.destinationType), call.route.originalCalled || call.route.finalCalled, hasRedirect ? call.forwarding.reason : call.destination.device)}
      <span class="flow-arrow ${hasRedirect ? "" : "hidden-node"}">→</span>
      ${flowNode(destinationLabel(call.route.destinationType), call.route.finalCalled, call.destination.device, "number", hasRedirect ? "" : "hidden-node")}
    </div>

    <div class="detail-grid">
      ${detail("Started", call.timing.originatedAt)}
      ${detail("Connected", formatTime(call.timing.connectedAt))}
      ${detail("Ring time", call.timing.ringSeconds === null ? "Unknown" : `${call.timing.ringSeconds} seconds`)}
      ${detail("Connected duration", call.timing.durationSeconds === null ? "Unknown" : `${call.timing.durationSeconds} seconds`)}
      ${detail("Caller user", call.caller.userId, "identity")}
      ${detail("Caller IP", call.caller.ip, "ip")}
      ${detail("Destination IP", call.destination.ip, "ip")}
      ${detail("Cleared by", call.outcome.clearedBy)}
    </div>

    ${renderQuality(call.quality)}
    <details class="raw-panel"><summary>Show decoded raw fields</summary><pre>${escapeHtml(raw)}</pre></details>
  </article>`;
}

function renderReport() {
  if (!decodedReport) return;
  const { report, summary, calls } = decodedReport;
  elements.reportTitle.textContent = report.filename;
  elements.reportMeta.textContent = `${summary.totalCalls} call record${summary.totalCalls === 1 ? "" : "s"} · ${report.format} · processed in memory`;
  elements.callCount.textContent = `${calls.length} total`;
  renderSummary(summary);
  elements.callsList.innerHTML = calls.map(renderCall).join("");
}

async function decodeFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".txt") && file.type && file.type !== "text/plain") {
    return showToast("Please choose the original plain-text MailToFile report.");
  }

  selectedFile = file;
  setView("loading");
  try {
    const response = await fetch("/api/decode", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Report-Filename": encodeURIComponent(file.name)
      },
      body: file
    });
    const data = await response.json();
    if (response.status === 401) {
      elements.loginOverlay.classList.remove("hidden");
      setView("upload");
      return;
    }
    if (!response.ok) throw new Error(data.error || "The report could not be decoded.");
    data.report.filename = decodeURIComponent(data.report.filename);
    decodedReport = data;
    renderReport();
    setView("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    setView("upload");
    showToast(error.message);
  }
}

function resetReport() {
  decodedReport = null;
  selectedFile = null;
  elements.fileInput.value = "";
  elements.redactionToggle.checked = false;
  setView("upload");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exportReport() {
  if (!decodedReport) return;
  const blob = new Blob([JSON.stringify(decodedReport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${decodedReport.report.filename.replace(/\.txt$/i, "")}-decoded.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function checkSession() {
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    const session = await response.json();
    const needsLogin = session.authRequired && !session.authenticated;
    elements.loginOverlay.classList.toggle("hidden", !needsLogin);
    elements.logoutButton.classList.toggle("hidden", !session.authRequired || !session.authenticated);
    if (needsLogin) document.querySelector("#usernameInput").focus();
  } catch {
    showToast("The server is not responding.");
  }
}

elements.dropZone.addEventListener("click", () => elements.fileInput.click());
elements.dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    elements.fileInput.click();
  }
});
elements.fileInput.addEventListener("change", () => decodeFile(elements.fileInput.files[0]));
for (const eventName of ["dragenter", "dragover"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("dragging");
  });
}
elements.dropZone.addEventListener("drop", (event) => decodeFile(event.dataTransfer.files[0]));
elements.newReportButton.addEventListener("click", resetReport);
elements.exportButton.addEventListener("click", exportReport);
elements.redactionToggle.addEventListener("change", renderReport);

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.loginError.classList.add("hidden");
  const credentials = Object.fromEntries(new FormData(elements.loginForm));
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Sign-in failed.");
    elements.loginForm.reset();
    elements.loginOverlay.classList.add("hidden");
    elements.logoutButton.classList.remove("hidden");
    if (selectedFile) decodeFile(selectedFile);
  } catch (error) {
    elements.loginError.textContent = error.message;
    elements.loginError.classList.remove("hidden");
  }
});

elements.logoutButton.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  resetReport();
  elements.loginOverlay.classList.remove("hidden");
  elements.logoutButton.classList.add("hidden");
});

checkSession();
