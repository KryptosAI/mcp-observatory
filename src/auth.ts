import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const AUTH_DIR = path.join(homedir(), ".mcp-observatory");
const TOKEN_FILE = path.join(AUTH_DIR, "auth.json");

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

export async function loadToken(): Promise<StoredToken | null> {
  if (_cachedToken && !tokenExpired(_cachedToken)) return _cachedToken;
  try {
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
  await mkdir(AUTH_DIR, { recursive: true });
  await writeFile(TOKEN_FILE, JSON.stringify(token, null, 2), "utf8");
  _cachedToken = token;
}

export async function clearToken(): Promise<void> {
  _cachedToken = null;
  try {
    await writeFile(TOKEN_FILE, "", "utf8");
  } catch {
    // file may not exist
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

async function discoverOidc(issuer: string): Promise<OidcDiscovery> {
  const url = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`OIDC discovery failed (${res.status}): ${url}`);
  return (await res.json()) as OidcDiscovery;
}

export async function performDeviceFlow(issuer: string, clientId: string): Promise<StoredToken> {
  const config = await discoverOidc(issuer);

  if (!config.device_authorization_endpoint) {
    throw new Error("The identity provider does not support device authorization flow.");
  }

  const deviceRes = await fetch(config.device_authorization_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, scope: "openid profile email" }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!deviceRes.ok) {
    const text = await deviceRes.text();
    throw new Error(`Device authorization failed (${deviceRes.status}): ${text}`);
  }

  const deviceData = (await deviceRes.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete?: string;
    expires_in: number;
    interval?: number;
  };

  process.stdout.write(`\n  Open this URL in your browser:\n`);
  process.stdout.write(`  ${deviceData.verification_uri}\n`);
  process.stdout.write(`\n  Enter this code: ${deviceData.user_code}\n\n`);
  process.stdout.write(`  Waiting for authorization...\n`);

  const interval = (deviceData.interval ?? 5) * 1000;
  const deadline = Date.now() + (deviceData.expires_in * 1000);

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, interval));

    const tokenRes = await fetch(config.token_endpoint, {
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
      throw new Error(`Token exchange failed (${tokenRes.status}): ${err.error ?? "unknown"}`);
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
