# Call Log Reader

A privacy-first, self-hosted decoder for Cisco Unified Communications Manager CAR/CDR `MailToFile.txt` reports.

Drop in the original text export and Call Log Reader turns it into:

- A plain-English explanation of each call
- Caller, original destination, and final destination call paths
- Ring time and connected duration
- Forwarding reasons such as Call Forward No Answer
- Cisco Unity voicemail detection
- Q.850 call-clearing explanations
- CMR codec, packet-loss, jitter, latency, and concealment review
- Optional on-screen redaction and JSON export

Reports are processed entirely in memory. They are never written to disk, stored in a database, or sent to an external API.

## Quick start with Docker

```bash
git clone https://github.com/dbuxkemper/call-log-reader.git
cd call-log-reader
cp .env.example .env
nano .env
docker compose up -d --build
```

Open `http://SERVER-IP:3000`.

Set a strong password and session secret in `.env` before exposing the application:

```bash
openssl rand -hex 32
```

Paste that output into `SESSION_SECRET`. Change `APP_USERNAME` and `APP_PASSWORD` as desired. Leaving `APP_PASSWORD` blank disables the sign-in screen.

## Ubuntu server installation

Install Docker on Ubuntu 22.04 or 24.04:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"${UBUNTU_CODENAME:-$VERSION_CODENAME}\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin git
```

Deploy the application under `/opt`:

```bash
cd /opt
sudo git clone https://github.com/dbuxkemper/call-log-reader.git
sudo chown -R "$USER":"$USER" /opt/call-log-reader
cd /opt/call-log-reader

cp .env.example .env
SESSION_SECRET_VALUE="$(openssl rand -hex 32)"
sed -i "s/replace-with-a-long-random-value/$SESSION_SECRET_VALUE/" .env
nano .env

docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:3000/api/health
```

The Compose configuration runs the container with a read-only filesystem, drops Linux capabilities, and does not mount a report-storage volume.

## Reverse proxy

An Nginx starting point is included at [`deploy/nginx.conf.example`](deploy/nginx.conf.example). Replace the hostname, copy it into `/etc/nginx/sites-available/`, enable it, and add your normal TLS configuration.

If Nginx is on the same server, you can limit direct exposure by changing the Compose port mapping to:

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

## Updating

```bash
cd /opt/call-log-reader
git pull --ff-only
docker compose up -d --build
docker image prune -f
curl -fsS http://127.0.0.1:3000/api/health
```

## Local development

No third-party Node packages are required.

```bash
npm test
npm run check
npm start
```

The server listens on port `3000` by default.

## Supported input

The initial parser targets CUCM CAR on-demand fixed-width text reports containing blocks such as:

```text
Call Type :Simple
CDR
...
Origination CMR
...
Destination CMR
...
```

It understands the modern CDR layout that includes RSVP fields even when the human-readable CAR header omits those column names. Unsupported files are rejected with a clear error instead of being partially guessed.

## Security and privacy

- Uploads are capped at 2 MB by default.
- Report bodies are parsed directly from request memory.
- Responses disable browser caching.
- Optional application login uses an HMAC-signed, HTTP-only, same-site cookie.
- Login attempts are rate-limited in memory.
- Security headers include a restrictive Content Security Policy.
- Use HTTPS at the reverse proxy when accessing the application over a network.

The source repository can be public without exposing report data. Never commit real CUCM exports; they contain phone numbers, usernames, email addresses, internal IPs, device names, and call metadata.

## License

MIT
