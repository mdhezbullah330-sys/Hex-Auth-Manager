/**
 * hexauth.js — Hex Auth Node.js SDK
 * Version: 1.0.0
 * Docs: https://hexauth.app/docs
 *
 * Requires Node.js 18+ (uses native fetch)
 * No external dependencies.
 *
 * npm: Copy this file into your project, or:
 *   const { HexAuth } = require("./hexauth");
 */

"use strict";

const os = require("os");
const crypto = require("crypto");

/**
 * Generate a hardware identifier for the current machine.
 * @returns {string} 32-char hex string
 */
function getHwid() {
  const parts = [
    os.hostname(),
    os.arch(),
    os.cpus()[0]?.model ?? "",
    String(os.totalmem()),
  ].join("|");
  return crypto.createHash("sha256").update(parts).digest("hex").slice(0, 32);
}

class HexAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "HexAuthError";
  }
}

class LoginResult {
  /**
   * @param {{ ok: boolean; message?: string; sessionToken?: string; user?: { username: string; plan: string; expiresAt?: string } }} data
   */
  constructor(data) {
    this.ok = Boolean(data.ok);
    this.message = data.message ?? "";
    this.sessionToken = data.sessionToken ?? null;
    this.user = data.user ?? null;
  }

  get username() { return this.user?.username ?? null; }
  get plan()     { return this.user?.plan ?? null; }

  toString() {
    return `LoginResult { ok: ${this.ok}, user: ${this.user?.username} }`;
  }
}

class Variable {
  /**
   * @param {{ name: string; value: string }} data
   */
  constructor(data) {
    this.name = data.name ?? "";
    this.value = data.value ?? "";
  }
}

class HexAuth {
  /**
   * @param {{ appId: string; appSecret: string; version?: string; endpoint?: string; timeout?: number }} options
   *
   * @example
   * const api = new HexAuth({
   *   appId: "YOUR_APP_ID",
   *   appSecret: "YOUR_SECRET",
   *   version: "1.0",
   * });
   */
  constructor({ appId, appSecret, version = "1.0", endpoint = "https://hexauth.app/api", timeout = 10000 } = {}) {
    if (!appId || !appSecret) throw new HexAuthError("appId and appSecret are required");
    this._appId = appId;
    this._appSecret = appSecret;
    this._version = version;
    this._endpoint = endpoint.replace(/\/+$/, "");
    this._timeout = timeout;
    this._hwid = getHwid();
    this._sessionToken = null;
  }

  async _fetch(method, path, body, token) {
    const url = `${this._endpoint}${path}`;
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": `HexAuth-Node/1.0 v${this._version}`,
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this._timeout);
    try {
      const resp = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      return await resp.json();
    } catch (err) {
      clearTimeout(timer);
      return { ok: false, message: err.name === "AbortError" ? "Request timed out" : `Network error: ${err.message}` };
    }
  }

  /**
   * Authenticate a user. Binds HWID on first login.
   * @param {{ username: string; password: string }} opts
   * @returns {Promise<LoginResult>}
   */
  async login({ username, password }) {
    const data = await this._fetch("POST", "/sdk/login", {
      appId: this._appId,
      username,
      password,
      hwid: this._hwid,
      version: this._version,
    });
    const result = new LoginResult(data);
    if (result.ok && result.sessionToken) this._sessionToken = result.sessionToken;
    return result;
  }

  /**
   * Validate an existing session. Uses last login token if not provided.
   * @param {string} [sessionToken]
   * @returns {Promise<LoginResult>}
   */
  async validate(sessionToken) {
    const token = sessionToken ?? this._sessionToken;
    if (!token) return new LoginResult({ ok: false, message: "No session token" });
    const data = await this._fetch("POST", "/sdk/validate", { sessionToken: token });
    return new LoginResult(data);
  }

  /**
   * Fetch a remote variable by name. Requires active session.
   * @param {string} name
   * @param {string} [sessionToken]
   * @returns {Promise<Variable>}
   */
  async getVariable(name, sessionToken) {
    const token = sessionToken ?? this._sessionToken;
    if (!token) throw new HexAuthError("Not logged in. Call login() first.");
    const data = await this._fetch("GET", `/sdk/variable/${encodeURIComponent(name)}`, null, token);
    return new Variable(data);
  }

  /** @returns {string} Hardware ID of the current machine */
  static getHwid() { return getHwid(); }

  /** @returns {string | null} Current session token */
  get sessionToken() { return this._sessionToken; }
}

module.exports = { HexAuth, LoginResult, Variable, HexAuthError, getHwid };

// ── Quick-start example ──────────────────────────────────────────────────────
// const { HexAuth } = require("./hexauth");
//
// const api = new HexAuth({
//   appId: "YOUR_APP_ID",
//   appSecret: "YOUR_SECRET",
//   version: "1.0",
// });
//
// const result = await api.login({ username: "developer123", password: "secure_password" });
// if (result.ok) {
//   console.log(`Welcome ${result.user.username}! Plan: ${result.user.plan}`);
//   const v = await api.getVariable("download_url");
//   console.log(`Download: ${v.value}`);
// } else {
//   console.log(`Auth failed: ${result.message}`);
// }
