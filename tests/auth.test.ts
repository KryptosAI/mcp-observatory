import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

import { readFile, writeFile, mkdir } from "node:fs/promises";

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
    mockedMkdir.mockResolvedValue(undefined);
    mockedWriteFile.mockResolvedValue(undefined);
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
        "utf8",
      );
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
        "utf8",
      );
    });

    it("succeeds even when file doesn't exist", async () => {
      const auth = await importAuth();
      mockedWriteFile.mockRejectedValue(new Error("ENOENT"));

      await expect(auth.clearToken()).resolves.toBeUndefined();
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
