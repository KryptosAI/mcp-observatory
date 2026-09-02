import { chmod, readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const AUTH_DIR = path.join(homedir(), ".mcp-observatory");
const TOKEN_FILE = path.join(AUTH_DIR, "auth.json");
const AUTH_DIR_MODE = 0o700;
const TOKEN_FILE_MODE = 0o600;
const MAX_CLOUD_DEVICE_FLOW_SECONDS = 15 * 60;
const MIN_CLOUD_POLL_INTERVAL_SECONDS = 1;
const MAX_CLOUD_POLL_INTERVAL_SECONDS = 60;
const MAX_CLOUD_ACCESS_TOKEN_LENGTH = 16_384;
const MAX_CLOUD_IDENTITY_LENGTH = 320;
const MAX_CLOUD_TOKEN_LIFETIME_SECONDS = 365 * 24 * 60 * 60;
const MAX_CLOUD_RESPONSE_BYTES = 64 * 1024;

export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  idToken?: string;
  issuer: string;
  clientId: string;
  email?: string;
  org?: string;
  sub?: string;
}

let _cachedToken: StoredToken | null = null;

function tokenExpired(token: StoredToken): boolean {
  if (!token.expiresAt) return false;
  return Date.now() >= token.expiresAt - 60_000;
}

function isMissingPath(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

async function tightenExistingMode(filePath: string, mode: number): Promise<void> {
  try {
    await chmod(filePath, mode);
  } catch (error) {
    if (!isMissingPath(error)) throw error;
  }
}

export async function loadToken(): Promise<StoredToken | null> {
  if (_cachedToken && !tokenExpired(_cachedToken)) return _cachedToken;
  try {
    await chmod(AUTH_DIR, AUTH_DIR_MODE);
    await chmod(TOKEN_FILE, TOKEN_FILE_MODE);
    const raw = await readFile(TOKEN_FILE, "utf8");
    _cachedToken = JSON.parse(raw) as StoredToken;
    if (tokenExpired(_cachedToken)) {
      _cachedToken = null;
      return null;
    }
    return _cachedToken;
  } catch {
    return null;
  }
}

export async function saveToken(token: StoredToken): Promise<void> {
  await mkdir(AUTH_DIR, { recursive: true, mode: AUTH_DIR_MODE });
  await chmod(AUTH_DIR, AUTH_DIR_MODE);
  await tightenExistingMode(TOKEN_FILE, TOKEN_FILE_MODE);
  await writeFile(TOKEN_FILE, JSON.stringify(token, null, 2), { encoding: "utf8", mode: TOKEN_FILE_MODE });
  await chmod(TOKEN_FILE, TOKEN_FILE_MODE);
  _cachedToken = token;
}

export async function clearToken(): Promise<void> {
  _cachedToken = null;
  try {
    await chmod(AUTH_DIR, AUTH_DIR_MODE);
    await tightenExistingMode(TOKEN_FILE, TOKEN_FILE_MODE);
    await writeFile(TOKEN_FILE, "", { encoding: "utf8", mode: TOKEN_FILE_MODE });
    await chmod(TOKEN_FILE, TOKEN_FILE_MODE);
  } catch (error) {
    if (!isMissingPath(error)) throw error;
  }
}

export function hasValidToken(): boolean {
  return _cachedToken !== null && !tokenExpired(_cachedToken);
}

export async function getAccessToken(): Promise<string | null> {
  const token = await loadToken();
  if (!token || tokenExpired(token)) return null;
  return token.accessToken;
}

export async function whoami(): Promise<{ email?: string; org?: string; authenticated: boolean }> {
  const token = await loadToken();
  if (!token || tokenExpired(token)) return { authenticated: false };
  return {
    authenticated: true,
    email: token.email,
    org: token.org,
  };
}

interface OidcDiscovery {
  issuer: string;
  device_authorization_endpoint?: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
}

interface CloudDeviceAuthorizationResponse extends Record<string, unknown> {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval?: number;
}

interface CloudTokenResponse extends Record<string, unknown> {
  access_token: string;
  expires_in?: number;
  email?: string;
  org?: string;
}

function parseCloudJsonResponse(text: string, endpoint: string, status: number): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid payload");
    return value as Record<string, unknown>;
  } catch {
    throw new Error(`Cloud endpoint ${endpoint} returned invalid JSON (${status}).`);
  }
}

async function readCloudResponseText(response: Response, endpoint: string): Promise<string> {
  const declaredLength = Number(response.headers?.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CLOUD_RESPONSE_BYTES) {
    throw new Error(`Cloud endpoint ${endpoint} returned an oversized response (${response.status}).`);
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_CLOUD_RESPONSE_BYTES) {
    throw new Error(`Cloud endpoint ${endpoint} returned an oversized response (${response.status}).`);
  }
  return text;
}

function isCloudDeviceAuthorizationResponse(value: Record<string, unknown>): value is CloudDeviceAuthorizationResponse {
  return typeof value["device_code"] === "string" && value["device_code"].length > 0 && value["device_code"].length <= 512
    && typeof value["user_code"] === "string" && value["user_code"].length > 0 && value["user_code"].length <= 128
    && typeof value["verification_uri"] === "string" && value["verification_uri"].length > 0 && value["verification_uri"].length <= 2_048
    && typeof value["expires_in"] === "number" && Number.isFinite(value["expires_in"]) && value["expires_in"] > 0
    && (value["interval"] === undefined
      || (typeof value["interval"] === "number" && Number.isFinite(value["interval"]) && value["interval"] >= 0));
}

function isOptionalBoundedString(value: unknown, maxLength: number): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.length > 0 && value.length <= maxLength);
}

function isCloudTokenResponse(value: Record<string, unknown>): value is CloudTokenResponse {
  return typeof value["access_token"] === "string"
    && value["access_token"].trim().length > 0
    && value["access_token"].length <= MAX_CLOUD_ACCESS_TOKEN_LENGTH
    && (value["expires_in"] === undefined
      || (typeof value["expires_in"] === "number"
        && Number.isFinite(value["expires_in"])
        && value["expires_in"] > 0
        && value["expires_in"] <= MAX_CLOUD_TOKEN_LIFETIME_SECONDS))
    && isOptionalBoundedString(value["email"], MAX_CLOUD_IDENTITY_LENGTH)
    && isOptionalBoundedString(value["org"], MAX_CLOUD_IDENTITY_LENGTH);
}

export function requireSafeHttpUrl(value: string, label = "URL"): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid HTTP or HTTPS URL.`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${label} must use HTTP or HTTPS.`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${label} must not contain embedded credentials.`);
  }
  return parsed;
}

export function browserLaunch(url: string, platform = process.platform): { command: string; args: string[] } {
  const safeUrl = requireSafeHttpUrl(url, "Browser URL").href;
  if (platform === "darwin") return { command: "open", args: [safeUrl] };
  if (platform === "win32") return { command: "rundll32.exe", args: ["url.dll,FileProtocolHandler", safeUrl] };
  return { command: "xdg-open", args: [safeUrl] };
}

async function discoverOidc(issuer: string): Promise<OidcDiscovery> {
  const issuerUrl = requireSafeHttpUrl(issuer, "OIDC issuer");
  const url = new URL(".well-known/openid-configuration", `${issuerUrl.href.replace(/\/$/, "")}/`).href;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`OIDC discovery failed (${res.status}): ${url}`);
  const discovery = (await res.json()) as OidcDiscovery;
  requireSafeHttpUrl(discovery.token_endpoint, "OIDC token endpoint");
  if (discovery.device_authorization_endpoint) {
    requireSafeHttpUrl(discovery.device_authorization_endpoint, "OIDC device authorization endpoint");
  }
  return discovery;
}

export async function openBrowser(url: string): Promise<void> {
  try {
    const { command, args } = browserLaunch(url);
    await execFileAsync(command, args);
  } catch {
    // Printing the URL is sufficient when the environment has no GUI browser.
  }
}

export async function performCloudDeviceFlow(endpoint: string): Promise<StoredToken> {
  const baseUrl = requireSafeHttpUrl(endpoint, "Cloud endpoint").href.replace(/\/$/, "");
  const deviceRes = await fetch(`${baseUrl}/auth/device`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!deviceRes.ok) throw new Error(`Cloud device authorization failed at /auth/device (${deviceRes.status}).`);
  const deviceText = await readCloudResponseText(deviceRes, "/auth/device");
  const deviceData = parseCloudJsonResponse(deviceText, "/auth/device", deviceRes.status);
  if (!isCloudDeviceAuthorizationResponse(deviceData)) {
    throw new Error(`Cloud endpoint /auth/device returned an invalid response (${deviceRes.status}).`);
  }
  process.stdout.write(`\n  Open this URL in your browser:\n  ${deviceData.verification_uri}\n\n  Enter this code: ${deviceData.user_code}\n\n  Waiting for authorization...\n`);
  await openBrowser(requireSafeHttpUrl(deviceData.verification_uri, "Verification URL").href);
  const flowSeconds = Math.min(deviceData.expires_in, MAX_CLOUD_DEVICE_FLOW_SECONDS);
  const deadline = Date.now() + flowSeconds * 1000;
  const pollSeconds = Math.min(
    Math.max(deviceData.interval ?? 5, MIN_CLOUD_POLL_INTERVAL_SECONDS),
    MAX_CLOUD_POLL_INTERVAL_SECONDS,
  );
  const interval = pollSeconds * 1000;
  while (Date.now() < deadline) {
    const remainingBeforeSleep = deadline - Date.now();
    if (remainingBeforeSleep <= 0) break;
    const sleepMs = Math.min(interval, remainingBeforeSleep);
    await new Promise(resolve => setTimeout(resolve, sleepMs));
    if (sleepMs >= remainingBeforeSleep) break;
    if (Date.now() >= deadline) break;
    const remaining = deadline - Date.now();
    const tokenRes = await fetch(`${baseUrl}/auth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_code: deviceData.device_code }),
      signal: AbortSignal.timeout(Math.max(1, Math.min(10_000, remaining))),
    });
    if (Date.now() >= deadline) break;
    if (tokenRes.status === 429 || (tokenRes.status >= 500 && tokenRes.status <= 599)) continue;
    const tokenText = await readCloudResponseText(tokenRes, "/auth/device/token");
    if (Date.now() >= deadline) break;
    const tokenData = parseCloudJsonResponse(tokenText, "/auth/device/token", tokenRes.status);
    if (!tokenRes.ok) {
      if (tokenData["error"] === "authorization_pending") continue;
      throw new Error(`Cloud token exchange failed at /auth/device/token (${tokenRes.status}).`);
    }
    if (!isCloudTokenResponse(tokenData)) {
      throw new Error(`Cloud endpoint /auth/device/token returned an invalid response (${tokenRes.status}).`);
    }
    const token: StoredToken = {
      accessToken: tokenData.access_token,
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      issuer: baseUrl,
      clientId: "mcp-observatory-cli",
      email: tokenData.email,
      org: tokenData.org,
    };
    await saveToken(token);
    return token;
  }
  throw new Error("Cloud device authorization timed out. Please try again.");
}

export async function performDeviceFlow(issuer: string, clientId: string): Promise<StoredToken> {
  const config = await discoverOidc(issuer);

  if (!config.device_authorization_endpoint) {
    throw new Error("The identity provider does not support device authorization flow.");
  }

  const deviceAuthorizationEndpoint = requireSafeHttpUrl(config.device_authorization_endpoint, "OIDC device authorization endpoint").href;
  const tokenEndpoint = requireSafeHttpUrl(config.token_endpoint, "OIDC token endpoint").href;
  const deviceRes = await fetch(deviceAuthorizationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, scope: "openid profile email" }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!deviceRes.ok) {
    throw new Error(`Device authorization failed (${deviceRes.status}).`);
  }

  const deviceData = (await deviceRes.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete?: string;
    expires_in: number;
    interval?: number;
  };
  requireSafeHttpUrl(deviceData.verification_uri, "Verification URL");

  process.stdout.write(`\n  Open this URL in your browser:\n`);
  process.stdout.write(`  ${deviceData.verification_uri}\n`);
  process.stdout.write(`\n  Enter this code: ${deviceData.user_code}\n\n`);
  process.stdout.write(`  Waiting for authorization...\n`);

  const interval = (deviceData.interval ?? 5) * 1000;
  const deadline = Date.now() + (deviceData.expires_in * 1000);

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, interval));

    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceData.device_code,
        client_id: clientId,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!tokenRes.ok) {
      const err = (await tokenRes.json().catch(() => ({}))) as { error?: string };
      if (err.error === "authorization_pending") continue;
      if (err.error === "slow_down") {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      throw new Error(`Token exchange failed (${tokenRes.status}).`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      id_token?: string;
    };

    const token: StoredToken = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
      idToken: tokenData.id_token,
      issuer,
      clientId,
    };

    if (tokenData.id_token) {
      try {
        const parts = tokenData.id_token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as Record<string, unknown>;
          token.email = typeof payload["email"] === "string" ? payload["email"] : undefined;
          token.org = typeof payload["org"] === "string" ? payload["org"] : undefined;
          token.sub = typeof payload["sub"] === "string" ? payload["sub"] : undefined;
        }
      } catch {
        // id_token parsing is best-effort
      }
    }

    await saveToken(token);
    return token;
  }

  throw new Error("Device authorization timed out. Please try again.");
}
