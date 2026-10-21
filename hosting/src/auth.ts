function textClaim(value: unknown, fallback: string): string { return typeof value === "string" ? value : fallback; }

export interface OidcConfig {
  issuer: string;
  jwksUrl: string;
  audience: string;
}

export interface AuthClaims {
  sub: string;
  userId?: number;
  email?: string;
  githubLogin?: string;
  org?: string;
  orgId?: number;
  orgDomain?: string;
  plan?: string;
  exp?: number;
  purpose?: string;
}

const textEncoder = new TextEncoder();

function base64UrlEncode(value: string | ArrayBuffer | Uint8Array): string {
  const bytes = typeof value === "string"
    ? textEncoder.encode(value)
    : value instanceof Uint8Array
      ? value
      : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  const binary = atob(base64 + "=".repeat(padding));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function base64UrlDecode(value: string): string {
  return new TextDecoder().decode(base64UrlDecodeBytes(value));
}

async function hmac(secret: string, value: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
}

async function hmacVerify(secret: string, value: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return crypto.subtle.verify("HMAC", key, base64UrlDecodeBytes(signature), textEncoder.encode(value));
}

export async function signJson(payload: Record<string, unknown>, secret: string): Promise<string> {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(await hmac(secret, encoded));
  return `${encoded}.${signature}`;
}

export async function verifyJson<T>(
  token: string,
  secret: string,
): Promise<T | null> {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !(await hmacVerify(secret, encoded, signature))) return null;
  try {
    return JSON.parse(base64UrlDecode(encoded)) as T;
  } catch {
    return null;
  }
}

export async function createSessionToken(claims: Omit<AuthClaims, "exp">, secret: string): Promise<string> {
  return signJson({ ...claims, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, secret);
}

export async function verifySessionToken(token: string, secret: string): Promise<AuthClaims | null> {
  if (!secret) return null;
  const claims = await verifyJson<AuthClaims>(token, secret);
  if (!claims || typeof claims.sub !== "string") return null;
  if (typeof claims.exp === "number" && claims.exp <= Math.floor(Date.now() / 1000)) return null;
  return claims;
}

export function randomToken(bytes = 24): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64UrlEncode(value);
}

let cachedJwks: Record<string, unknown> | null = null;
let jwksFetchedAt = 0;
const JWKS_TTL = 3600_000;

async function fetchJwks(jwksUrl: string): Promise<Record<string, unknown>> {
  if (cachedJwks && Date.now() - jwksFetchedAt < JWKS_TTL) return cachedJwks;
  const res = await fetch(jwksUrl);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const value: unknown = await res.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid JWKS response");
  const result = value as Record<string, unknown>;
  cachedJwks = result;
  jwksFetchedAt = Date.now();
  return result;
}

async function verifyJwtSignature(token: string, jwks: Record<string, unknown>): Promise<boolean> {
  try {
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    if (!headerPart || !payloadPart || !signaturePart) return false;
    const header = JSON.parse(base64UrlDecode(headerPart)) as Record<string, unknown>;
    const keys = jwks["keys"] as Array<Record<string, unknown>> | undefined;
    const key = keys?.find(candidate => !header["kid"] || candidate["kid"] === header["kid"]);
    if (!key) return false;
    const algorithm = textClaim(key["alg"], "RS256");
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      { kty: textClaim(key["kty"], "RSA"), n: textClaim(key["n"], ""), e: textClaim(key["e"], "AQAB"), alg: algorithm, ext: true },
      { name: algorithm.startsWith("RS") ? "RSASSA-PKCS1-v1_5" : "ECDSA", hash: "SHA-256" },
      false,
      ["verify"],
    );
    return crypto.subtle.verify(
      { name: algorithm.startsWith("RS") ? "RSASSA-PKCS1-v1_5" : "ECDSA", hash: "SHA-256" },
      cryptoKey,
      base64UrlDecodeBytes(signaturePart),
      textEncoder.encode(`${headerPart}.${payloadPart}`),
    );
  } catch {
    return false;
  }
}

export async function validateOidcToken(token: string, config: OidcConfig): Promise<AuthClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(base64UrlDecode(parts[1]!)) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (typeof payload["exp"] === "number" && Date.now() / 1000 > payload["exp"]) return null;
  if (config.audience && payload["aud"] !== config.audience) return null;
  if (!(await verifyJwtSignature(token, await fetchJwks(config.jwksUrl)))) return null;
  return {
    sub: textClaim(payload["sub"], ""),
    email: typeof payload["email"] === "string" ? payload["email"] : undefined,
    org: typeof payload["org"] === "string" ? payload["org"] : undefined,
    exp: typeof payload["exp"] === "number" ? payload["exp"] : undefined,
  };
}
