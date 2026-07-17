export interface OidcConfig {
  issuer: string;
  jwksUrl: string;
  audience: string;
}

export interface AuthClaims {
  sub: string;
  email?: string;
  org?: string;
  exp?: number;
}

let cachedJwks: Record<string, unknown> | null = null;
let jwksFetchedAt = 0;
const JWKS_TTL = 3600_000;

async function fetchJwks(jwksUrl: string): Promise<Record<string, unknown>> {
  if (cachedJwks && Date.now() - jwksFetchedAt < JWKS_TTL) {
    return cachedJwks;
  }
  const res = await fetch(jwksUrl);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  cachedJwks = (await res.json()) as Record<string, unknown>;
  jwksFetchedAt = Date.now();
  return cachedJwks;
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(base64UrlDecode(parts[1]!)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function verifyJwtSignature(token: string, jwks: Record<string, unknown>): Promise<boolean> {
  try {
    const headerB64 = token.split(".")[0]!;
    const header = JSON.parse(base64UrlDecode(headerB64)) as Record<string, unknown>;
    const kid = header["kid"] as string | undefined;
    const keys = jwks["keys"] as Array<Record<string, unknown>> | undefined;
    if (!keys || keys.length === 0) return false;

    const key = kid ? keys.find(k => k["kid"] === kid) : keys[0];
    if (!key) return false;

    const keyData = key as Record<string, unknown>;
    const algo = keyData["alg"] as string || "RS256";

    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(JSON.stringify(keyData));

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      {
        kty: keyData["kty"] as string || "RSA",
        n: keyData["n"] as string,
        e: keyData["e"] as string,
        alg: algo,
        ext: true,
      },
      { name: algo.startsWith("RS") ? "RSASSA-PKCS1-v1_5" : "ECDSA", hash: algo.startsWith("RS") ? "SHA-256" : "SHA-256" },
      false,
      ["verify"],
    );

    const [headerBytes, payloadBytes, sigBytes] = token.split(".").map(part => {
      const b64 = part!.replace(/-/g, "+").replace(/_/g, "/");
      const padding = 4 - (b64.length % 4);
      return Uint8Array.from(atob(b64 + (padding < 4 ? "=".repeat(padding) : "")), c => c.charCodeAt(0));
    });

    const signedData = new Uint8Array(headerBytes!.length + 1 + payloadBytes!.length);
    signedData.set(headerBytes!);
    signedData.set([46], headerBytes!.length);
    signedData.set(payloadBytes!, headerBytes!.length + 1);

    return crypto.subtle.verify(
      { name: algo.startsWith("RS") ? "RSASSA-PKCS1-v1_5" : "ECDSA", hash: "SHA-256" },
      cryptoKey,
      sigBytes!,
      signedData,
    );
  } catch {
    return false;
  }
}

export async function validateOidcToken(
  token: string,
  config: OidcConfig,
): Promise<AuthClaims | null> {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  if (payload["exp"] && typeof payload["exp"] === "number" && Date.now() / 1000 > payload["exp"]) {
    return null;
  }

  if (config.audience && payload["aud"] !== config.audience) {
    return null;
  }

  const jwks = await fetchJwks(config.jwksUrl);
  const valid = await verifyJwtSignature(token, jwks);
  if (!valid) return null;

  return {
    sub: String(payload["sub"] ?? ""),
    email: typeof payload["email"] === "string" ? payload["email"] : undefined,
    org: typeof payload["org"] === "string" ? payload["org"] : undefined,
    exp: typeof payload["exp"] === "number" ? payload["exp"] : undefined,
  };
}
