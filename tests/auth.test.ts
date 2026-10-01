import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  chmod: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFile: vi.fn((_command: string, _args: string[], callback: (error: Error | null) => void) => callback(null)),
}));

import { chmod, readFile, writeFile, mkdir } from "node:fs/promises";

const mockedChmod = vi.mocked(chmod);
const mockedReadFile = vi.mocked(readFile);
const mockedWriteFile = vi.mocked(writeFile);
const mockedMkdir = vi.mocked(mkdir);

const VALID_TOKEN = {
  accessToken: "test-access-token",
  refreshToken: "test-refresh-token",
  expiresAt: Date.now() + 3600_000,
  issuer: "https://auth.example.com",
  clientId: "test-client",
  email: "user@example.com",
  org: "test-org",
};

async function importAuth() {
  return import("../src/auth.js");
}

describe("auth module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedChmod.mockResolvedValue(undefined);
    mockedMkdir.mockResolvedValue(undefined);
    mockedWriteFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("saveToken / loadToken", () => {
    it("saves and loads a token", async () => {
      const auth = await importAuth();

      mockedReadFile.mockResolvedValue(JSON.stringify(VALID_TOKEN));

      await auth.saveToken(VALID_TOKEN);
      const loaded = await auth.loadToken();

      expect(loaded).toEqual(VALID_TOKEN);
      expect(mockedWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("auth.json"),
        JSON.stringify(VALID_TOKEN, null, 2),
        { encoding: "utf8", mode: 0o600 },
      );
      expect(mockedMkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true, mode: 0o700 });
    });

    it("tightens legacy permissive auth storage before loading a token", async () => {
      const auth = await importAuth();
      await auth.clearToken();
      vi.clearAllMocks();
      mockedChmod.mockResolvedValue(undefined);
      mockedReadFile.mockResolvedValue(JSON.stringify(VALID_TOKEN));

      await expect(auth.loadToken()).resolves.toEqual(VALID_TOKEN);

      expect(mockedChmod).toHaveBeenNthCalledWith(1, expect.stringMatching(/\.mcp-observatory$/), 0o700);
      expect(mockedChmod).toHaveBeenNthCalledWith(2, expect.stringContaining("auth.json"), 0o600);
      expect(mockedReadFile).toHaveBeenCalledAfter(mockedChmod);
    });

    it("fails closed when legacy permissions cannot be tightened before load", async () => {
      const auth = await importAuth();
      await auth.clearToken();
      vi.clearAllMocks();
      mockedChmod.mockRejectedValue(Object.assign(new Error("access denied"), { code: "EACCES" }));

      await expect(auth.loadToken()).resolves.toBeNull();

      expect(mockedReadFile).not.toHaveBeenCalled();
    });

    it("treats the empty logged-out marker as no stored token", async () => {
      const auth = await importAuth();
      await auth.clearToken();
      vi.clearAllMocks();
      mockedChmod.mockResolvedValue(undefined);
      mockedReadFile.mockResolvedValue("");

      await expect(auth.loadToken()).resolves.toBeNull();
    });

    it("tightens legacy permissive auth storage when saving a token", async () => {
      const auth = await importAuth();

      await auth.saveToken(VALID_TOKEN);

      expect(mockedChmod).toHaveBeenCalledWith(expect.stringMatching(/\.mcp-observatory$/), 0o700);
      expect(mockedChmod).toHaveBeenCalledWith(expect.stringContaining("auth.json"), 0o600);
      expect(mockedChmod).toHaveBeenCalledTimes(3);
      const writeOrder = mockedWriteFile.mock.invocationCallOrder[0]!;
      const tokenChmodOrders = mockedChmod.mock.calls.flatMap((call, index) =>
        String(call[0]).endsWith("auth.json") ? [mockedChmod.mock.invocationCallOrder[index]!] : [],
      );
      expect(tokenChmodOrders).toHaveLength(2);
      expect(tokenChmodOrders[0]).toBeLessThan(writeOrder);
      expect(tokenChmodOrders[1]).toBeGreaterThan(writeOrder);
    });

    it("returns null when token file doesn't exist", async () => {
      const auth = await importAuth();
      mockedReadFile.mockRejectedValue(new Error("ENOENT"));

      await auth.clearToken();
      const loaded = await auth.loadToken();

      expect(loaded).toBeNull();
    });

    it("returns null for expired token", async () => {
      const auth = await importAuth();
      const expired = { ...VALID_TOKEN, expiresAt: Date.now() - 60_000 };

      mockedReadFile.mockResolvedValue(JSON.stringify(expired));
      await auth.saveToken(expired);

      const loaded = await auth.loadToken();
      expect(loaded).toBeNull();
    });

    it("returns null for token without expiry", async () => {
      const auth = await importAuth();
      const noExpiry = { ...VALID_TOKEN, expiresAt: undefined };

      mockedReadFile.mockResolvedValue(JSON.stringify(noExpiry));
      await auth.saveToken(noExpiry);

      const loaded = await auth.loadToken();
      expect(loaded).toEqual(noExpiry);
    });
  });

  describe("hasValidToken", () => {
    it("returns true for valid cached token", async () => {
      const auth = await importAuth();
      mockedReadFile.mockResolvedValue(JSON.stringify(VALID_TOKEN));
      await auth.saveToken(VALID_TOKEN);

      expect(auth.hasValidToken()).toBe(true);
    });

    it("returns false for expired cached token", async () => {
      const auth = await importAuth();
      const expired = { ...VALID_TOKEN, expiresAt: Date.now() - 60_000 };
      mockedReadFile.mockResolvedValue(JSON.stringify(expired));
      await auth.saveToken(expired);

      expect(auth.hasValidToken()).toBe(false);
    });

    it("returns false for empty cache", async () => {
      const auth = await importAuth();
      await auth.clearToken();

      expect(auth.hasValidToken()).toBe(false);
    });
  });

  describe("getAccessToken", () => {
    it("returns access token for valid session", async () => {
      const auth = await importAuth();
      mockedReadFile.mockResolvedValue(JSON.stringify(VALID_TOKEN));
      await auth.saveToken(VALID_TOKEN);

      expect(await auth.getAccessToken()).toBe("test-access-token");
    });

    it("returns null for expired session", async () => {
      const auth = await importAuth();
      const expired = { ...VALID_TOKEN, expiresAt: Date.now() - 60_000 };
      mockedReadFile.mockResolvedValue(JSON.stringify(expired));
      await auth.saveToken(expired);

      expect(await auth.getAccessToken()).toBeNull();
    });

    it("returns null when no token exists", async () => {
      const auth = await importAuth();
      await auth.clearToken();
      mockedReadFile.mockRejectedValue(new Error("ENOENT"));

      expect(await auth.getAccessToken()).toBeNull();
    });
  });

  describe("whoami", () => {
    it("returns email and org for authenticated user", async () => {
      const auth = await importAuth();
      mockedReadFile.mockResolvedValue(JSON.stringify(VALID_TOKEN));
      await auth.saveToken(VALID_TOKEN);

      const info = await auth.whoami();
      expect(info.authenticated).toBe(true);
      expect(info.email).toBe("user@example.com");
      expect(info.org).toBe("test-org");
    });

    it("returns unauthenticated for expired token", async () => {
      const auth = await importAuth();
      const expired = { ...VALID_TOKEN, expiresAt: Date.now() - 60_000 };
      mockedReadFile.mockResolvedValue(JSON.stringify(expired));
      await auth.saveToken(expired);

      const info = await auth.whoami();
      expect(info.authenticated).toBe(false);
    });

    it("returns unauthenticated when no token exists", async () => {
      const auth = await importAuth();
      await auth.clearToken();

      const info = await auth.whoami();
      expect(info.authenticated).toBe(false);
    });
  });

  describe("clearToken", () => {
    it("clears cached token and writes empty file", async () => {
      const auth = await importAuth();
      mockedReadFile.mockResolvedValue(JSON.stringify(VALID_TOKEN));
      await auth.saveToken(VALID_TOKEN);
      expect(auth.hasValidToken()).toBe(true);

      await auth.clearToken();
      expect(auth.hasValidToken()).toBe(false);
      expect(mockedWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("auth.json"),
        "",
        { encoding: "utf8", mode: 0o600 },
      );
    });

    it("succeeds even when file doesn't exist", async () => {
      const auth = await importAuth();
      mockedWriteFile.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

      await expect(auth.clearToken()).resolves.toBeUndefined();
    });

    it("reports failures that could leave a stored token behind", async () => {
      const auth = await importAuth();
      mockedWriteFile.mockRejectedValue(Object.assign(new Error("access denied"), { code: "EACCES" }));

      await expect(auth.clearToken()).rejects.toThrow("access denied");
    });

    it("tightens legacy permissive auth storage while clearing it", async () => {
      const auth = await importAuth();

      await auth.clearToken();

      expect(mockedChmod).toHaveBeenCalledWith(expect.stringMatching(/\.mcp-observatory$/), 0o700);
      expect(mockedChmod).toHaveBeenCalledWith(expect.stringContaining("auth.json"), 0o600);
      const writeOrder = mockedWriteFile.mock.invocationCallOrder[0]!;
      const tokenChmodOrders = mockedChmod.mock.calls.flatMap((call, index) =>
        String(call[0]).endsWith("auth.json") ? [mockedChmod.mock.invocationCallOrder[index]!] : [],
      );
      expect(tokenChmodOrders).toHaveLength(2);
      expect(tokenChmodOrders[0]).toBeLessThan(writeOrder);
      expect(tokenChmodOrders[1]).toBeGreaterThan(writeOrder);
    });
  });

  describe("URL and browser launch hardening", () => {
    it("rejects non-HTTP URLs and embedded credentials", async () => {
      const auth = await importAuth();
      expect(() => auth.requireSafeHttpUrl("file:///tmp/payload", "Test URL")).toThrow("HTTP or HTTPS");
      expect(() => auth.requireSafeHttpUrl("https://user:secret@example.com", "Test URL")).toThrow("embedded credentials");
    });

    it("uses a non-shell Windows launcher and preserves metacharacters as one argument", async () => {
      const auth = await importAuth();
      const launch = auth.browserLaunch("https://example.com/activate?code=a%26calc.exe", "win32");
      expect(launch.command).toBe("rundll32.exe");
      expect(launch.args).toEqual([
        "url.dll,FileProtocolHandler",
        "https://example.com/activate?code=a%26calc.exe",
      ]);
    });

    it("rejects hostile cloud endpoints before fetching", async () => {
      const auth = await importAuth();
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);
      await expect(auth.performCloudDeviceFlow("javascript:alert(1)")).rejects.toThrow("Cloud endpoint");
      expect(mockFetch).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });
  });

  describe("performCloudDeviceFlow", () => {
    const deviceResponse = {
      device_code: "device-123",
      user_code: "ABCD-EFGH",
      verification_uri: "https://app.example.test/auth/device?user_code=ABCD-EFGH",
      expires_in: 300,
      interval: 1,
    };

    beforeEach(() => {
      vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    });

    it.each(["", "<html>upstream error</html>"])("rejects an empty or non-JSON start response", async (body) => {
      const auth = await importAuth();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(body),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = auth.performCloudDeviceFlow("https://app.example.test");
      await expect(result).rejects.toThrow("Cloud endpoint /auth/device returned invalid JSON (200).");
      await expect(result).rejects.not.toThrow("upstream error");

      vi.unstubAllGlobals();
    });

    it.each(["", "<html>secret response</html>"])("rejects an empty or non-JSON poll response", async (body) => {
      const auth = await importAuth();
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(deviceResponse)),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve(body),
        });
      vi.stubGlobal("fetch", mockFetch);

      const result = auth.performCloudDeviceFlow("https://app.example.test");
      await expect(result).rejects.toThrow("Cloud endpoint /auth/device/token returned invalid JSON (400).");
      await expect(result).rejects.not.toThrow("secret response");

      vi.unstubAllGlobals();
    });

    it("rejects a successful response with a malformed access token", async () => {
      const auth = await importAuth();
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(deviceResponse)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ access_token: { nested: "not-a-token" } })),
        });
      vi.stubGlobal("fetch", mockFetch);

      await expect(auth.performCloudDeviceFlow("https://app.example.test")).rejects.toThrow(
        "Cloud endpoint /auth/device/token returned an invalid response (200).",
      );
      expect(mockedWriteFile).not.toHaveBeenCalled();
    });

    it("does not poll or accept a token after the device deadline", async () => {
      const auth = await importAuth();
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          ...deviceResponse,
          expires_in: 0.01,
        })),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(auth.performCloudDeviceFlow("https://app.example.test")).rejects.toThrow(
        "Cloud device authorization timed out. Please try again.",
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockedWriteFile).not.toHaveBeenCalled();
    });

    it("recovers after transient poll responses", async () => {
      const auth = await importAuth();
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(deviceResponse)),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: () => Promise.resolve(""),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: () => Promise.resolve("<html>temporarily unavailable</html>"),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve(JSON.stringify({ error: "authorization_pending" })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({
            access_token: "new-access-token",
            expires_in: 3600,
            email: "user@example.com",
            org: "personal-1",
          })),
        });
      vi.stubGlobal("fetch", mockFetch);

      await expect(auth.performCloudDeviceFlow("https://app.example.test")).resolves.toMatchObject({
        accessToken: "new-access-token",
        email: "user@example.com",
        org: "personal-1",
      });
      expect(mockFetch).toHaveBeenCalledTimes(5);

      vi.unstubAllGlobals();
    });
  });

  describe("performDeviceFlow", () => {
    it("throws when discovery fails", async () => {
      const auth = await importAuth();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(
        auth.performDeviceFlow("https://bad.example.com", "client-id"),
      ).rejects.toThrow("OIDC discovery failed");

      vi.unstubAllGlobals();
    });

    it("throws when device authorization endpoint is missing", async () => {
      const auth = await importAuth();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => ({
          issuer: "https://auth.example.com",
          token_endpoint: "https://auth.example.com/token",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(
        auth.performDeviceFlow("https://auth.example.com", "client-id"),
      ).rejects.toThrow("does not support device authorization flow");

      vi.unstubAllGlobals();
    });

    it("throws when device authorization request fails", async () => {
      const auth = await importAuth();
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({
            device_authorization_endpoint: "https://auth.example.com/device",
            token_endpoint: "https://auth.example.com/token",
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => "invalid_client",
        });
      vi.stubGlobal("fetch", mockFetch);

      await expect(
        auth.performDeviceFlow("https://auth.example.com", "client-id"),
      ).rejects.toThrow("Device authorization failed");

      vi.unstubAllGlobals();
    });

    it("completes device flow and saves token", async () => {
      const auth = await importAuth();
      const idTokenPayload = Buffer.from(
        JSON.stringify({ email: "user@example.com", org: "test-org", sub: "user-123" }),
      ).toString("base64url");
      const idToken = `header.${idTokenPayload}.signature`;

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({
            device_authorization_endpoint: "https://auth.example.com/device",
            token_endpoint: "https://auth.example.com/token",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({
            device_code: "device-123",
            user_code: "ABCD-EFGH",
            verification_uri: "https://auth.example.com/activate",
            expires_in: 300,
            interval: 0,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            expires_in: 3600,
            id_token: idToken,
          }),
        });
      vi.stubGlobal("fetch", mockFetch);

      const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      const token = await auth.performDeviceFlow("https://auth.example.com", "client-id");

      expect(token.accessToken).toBe("new-access-token");
      expect(token.email).toBe("user@example.com");
      expect(token.org).toBe("test-org");
      expect(token.sub).toBe("user-123");
      expect(mockedWriteFile).toHaveBeenCalled();

      stdoutSpy.mockRestore();
      vi.unstubAllGlobals();
    });
  });
});
