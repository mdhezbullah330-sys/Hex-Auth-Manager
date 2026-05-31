import { Router, type IRouter } from "express";

const router: IRouter = Router();

// SDK file contents are inlined so they survive esbuild bundling (no __dirname dependency)
const SDK_CONTENT: Record<string, { filename: string; mime: string; content: string }> = {
  python: {
    filename: "hexauth.py",
    mime: "text/x-python",
    content: `"""
hexauth.py — Hex Auth Python SDK
Version: 1.0.0
Docs: https://hexauth.app/docs
"""

import hashlib
import platform
import socket
import uuid
import urllib.request
import urllib.error
import json
import sys
import subprocess
from typing import Optional


def _get_hwid() -> str:
    """Generate a unique hardware identifier for this machine."""
    try:
        parts = [
            platform.node(),
            platform.machine(),
            platform.processor(),
            str(uuid.getnode()),
        ]
        if sys.platform == "win32":
            try:
                result = subprocess.check_output(
                    "wmic diskdrive get SerialNumber",
                    shell=True, stderr=subprocess.DEVNULL
                ).decode().strip().split()
                if len(result) > 1:
                    parts.append(result[-1])
            except Exception:
                pass
        raw = "|".join(p for p in parts if p)
        return hashlib.sha256(raw.encode()).hexdigest()[:32]
    except Exception:
        return hashlib.sha256(platform.node().encode()).hexdigest()[:32]


class User:
    def __init__(self, data: dict):
        self.username: str = data.get("username", "")
        self.plan: str = data.get("plan", "free")
        self.expires_at: Optional[str] = data.get("expiresAt")

    def __repr__(self):
        return f"<User username={self.username!r} plan={self.plan!r}>"


class Variable:
    def __init__(self, data: dict):
        self.name: str = data.get("name", "")
        self.value: str = data.get("value", "")

    def __repr__(self):
        return f"<Variable {self.name!r}={self.value!r}>"


class LoginResult:
    def __init__(self, data: dict):
        self.ok: bool = data.get("ok", False)
        self.message: str = data.get("message", "")
        self.session_token: Optional[str] = data.get("sessionToken")
        self.user: Optional[User] = User(data["user"]) if data.get("user") else None

    def __bool__(self):
        return self.ok

    def __repr__(self):
        return f"<LoginResult ok={self.ok} user={self.user}>"


class HexAuthError(Exception):
    pass


class HexAuth:
    """
    Hex Auth SDK client.

    Usage:
        from hexauth import HexAuth

        api = HexAuth(
            app_id="YOUR_APP_ID",
            app_secret="YOUR_SECRET",
            version="1.0"
        )

        result = api.login("username", "password")
        if result.ok:
            print(f"Welcome {result.user.username}!")
    """

    def __init__(
        self,
        app_id: str,
        app_secret: str,
        version: str = "1.0",
        endpoint: str = "https://hexauth.app/api",
        timeout: int = 10,
    ):
        self.app_id = app_id
        self.app_secret = app_secret
        self.version = version
        self.endpoint = endpoint.rstrip("/")
        self.timeout = timeout
        self._session_token: Optional[str] = None
        self._hwid: str = _get_hwid()

    def _request(self, method: str, path: str, body: Optional[dict] = None, token: Optional[str] = None) -> dict:
        url = f"{self.endpoint}{path}"
        data = json.dumps(body).encode() if body else None
        headers = {
            "Content-Type": "application/json",
            "User-Agent": f"HexAuth-Python/1.0 v{self.version}",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"

        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            try:
                err = json.loads(e.read().decode())
                return {"ok": False, "message": err.get("message", str(e))}
            except Exception:
                return {"ok": False, "message": str(e)}
        except urllib.error.URLError as e:
            return {"ok": False, "message": f"Network error: {e.reason}"}

    def login(self, username: str, password: str) -> LoginResult:
        payload = {
            "appId": self.app_id,
            "username": username,
            "password": password,
            "hwid": self._hwid,
            "version": self.version,
        }
        data = self._request("POST", "/sdk/login", payload)
        result = LoginResult(data)
        if result.ok and result.session_token:
            self._session_token = result.session_token
        return result

    def validate(self, session_token: Optional[str] = None) -> LoginResult:
        token = session_token or self._session_token
        if not token:
            return LoginResult({"ok": False, "message": "No session token"})
        data = self._request("POST", "/sdk/validate", {"sessionToken": token})
        return LoginResult(data)

    def get_variable(self, name: str, session_token: Optional[str] = None) -> Variable:
        token = session_token or self._session_token
        if not token:
            raise HexAuthError("Not logged in. Call login() first.")
        data = self._request("GET", f"/sdk/variable/{name}", token=token)
        return Variable(data)

    @staticmethod
    def get_hwid() -> str:
        return _get_hwid()


if __name__ == "__main__":
    import getpass
    api = HexAuth(app_id=input("App ID: "), app_secret=input("App Secret: "), version="1.0")
    username = input("Username: ")
    password = getpass.getpass("Password: ")
    result = api.login(username, password)
    if result.ok:
        print(f"\\n✓ Welcome {result.user.username}! Plan: {result.user.plan}")
    else:
        print(f"\\n✗ Login failed: {result.message}")
        sys.exit(1)
`,
  },

  csharp: {
    filename: "HexAuth.cs",
    mime: "text/plain",
    content: `/// <summary>
/// HexAuth.cs — Hex Auth C# SDK
/// Version: 1.0.0
/// Docs: https://hexauth.app/docs
/// </summary>

using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace HexAuth
{
    public record User(
        [property: JsonPropertyName("username")] string Username,
        [property: JsonPropertyName("plan")] string Plan,
        [property: JsonPropertyName("expiresAt")] string? ExpiresAt
    );

    public record Variable(
        [property: JsonPropertyName("name")] string Name,
        [property: JsonPropertyName("value")] string Value
    );

    public record LoginResult(
        [property: JsonPropertyName("ok")] bool Ok,
        [property: JsonPropertyName("message")] string? Message,
        [property: JsonPropertyName("sessionToken")] string? SessionToken,
        [property: JsonPropertyName("user")] User? User
    );

    public class HexAuthException : Exception
    {
        public HexAuthException(string message) : base(message) { }
    }

    public class HexAuthClient : IDisposable
    {
        private readonly HttpClient _http;
        private readonly string _appId;
        private readonly string _appSecret;
        private readonly string _version;
        private readonly string _hwid;
        private string? _sessionToken;

        public HexAuthClient(
            string appId,
            string appSecret,
            string version = "1.0",
            string endpoint = "https://hexauth.app/api")
        {
            _appId = appId;
            _appSecret = appSecret;
            _version = version;
            _hwid = GetHwid();
            _http = new HttpClient { BaseAddress = new Uri(endpoint.TrimEnd('/') + "/") };
            _http.DefaultRequestHeaders.Add("User-Agent", $"HexAuth-CSharp/1.0 v{version}");
        }

        public async Task<LoginResult> LoginAsync(string username, string password)
        {
            var payload = new { appId = _appId, username, password, hwid = _hwid, version = _version };
            using var resp = await _http.PostAsJsonAsync("sdk/login", payload);
            var result = await resp.Content.ReadFromJsonAsync<LoginResult>()
                ?? throw new HexAuthException("Empty response from server");
            if (result.Ok && result.SessionToken != null)
                _sessionToken = result.SessionToken;
            return result;
        }

        public async Task<LoginResult> ValidateAsync(string? sessionToken = null)
        {
            var token = sessionToken ?? _sessionToken
                ?? throw new HexAuthException("No session token. Call LoginAsync() first.");
            using var resp = await _http.PostAsJsonAsync("sdk/validate", new { sessionToken = token });
            return await resp.Content.ReadFromJsonAsync<LoginResult>()
                ?? throw new HexAuthException("Empty response");
        }

        public async Task<Variable> GetVariableAsync(string name, string? sessionToken = null)
        {
            var token = sessionToken ?? _sessionToken
                ?? throw new HexAuthException("Not logged in. Call LoginAsync() first.");
            using var req = new HttpRequestMessage(HttpMethod.Get, $"sdk/variable/{name}");
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            using var resp = await _http.SendAsync(req);
            return await resp.Content.ReadFromJsonAsync<Variable>()
                ?? throw new HexAuthException("Empty response");
        }

        public static string GetHwid()
        {
            var parts = new[] { Environment.MachineName, RuntimeInformation.OSArchitecture.ToString(), Environment.ProcessorCount.ToString() };
            var raw = string.Join("|", parts);
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
            return Convert.ToHexString(bytes)[..32].ToLower();
        }

        public void Dispose() => _http.Dispose();
    }
}
`,
  },

  cpp: {
    filename: "hexauth.h",
    mime: "text/plain",
    content: `/**
 * hexauth.h — Hex Auth C++ SDK
 * Version: 1.0.0
 * Docs: https://hexauth.app/docs
 *
 * Dependencies: libcurl, openssl
 * Compile: g++ -std=c++17 main.cpp -lcurl -lssl -lcrypto -o app
 */

#pragma once
#include <string>
#include <stdexcept>
#include <sstream>
#include <iomanip>
#include <openssl/sha.h>
#include <curl/curl.h>
#ifdef _WIN32
  #include <windows.h>
#else
  #include <sys/utsname.h>
#endif

namespace hexjson {
  inline std::string escape(const std::string& s) {
    std::string out;
    for (char c : s) { if (c=='"') out+="\\\\\""; else if(c=='\\\\') out+="\\\\\\\\"; else out+=c; }
    return out;
  }
  inline std::string obj(std::initializer_list<std::pair<std::string,std::string>> f) {
    std::string o="{"; bool first=true;
    for (auto& [k,v]:f) { if(!first)o+=","; o+="\\""+k+"\\":\\""+escape(v)+"\\""; first=false; }
    return o+"}";
  }
  inline std::string get(const std::string& j, const std::string& k) {
    auto p=j.find("\\""+k+"\\""); if(p==std::string::npos)return "";
    p=j.find(":",p); if(p==std::string::npos)return ""; p++;
    while(p<j.size()&&(j[p]==' '||j[p]=='\\n'))p++;
    if(p<j.size()&&j[p]=='"'){p++; std::string v; while(p<j.size()&&j[p]!='"'){if(j[p]=='\\\\')p++; if(p<j.size())v+=j[p++]; else break;} return v;}
    if(p<j.size()&&j[p]=='t')return "true"; if(p<j.size()&&j[p]=='f')return "false";
    std::string v; while(p<j.size()&&",}\\n".find(j[p])==std::string::npos)v+=j[p++]; return v;
  }
}

namespace hexauth {
struct User { std::string username, plan, expires_at; };
struct Variable { std::string name, value; };
struct LoginResult { bool ok=false; std::string message,session_token; User user; explicit operator bool()const{return ok;} };

inline size_t _wcb(char* p,size_t s,size_t n,std::string* o){o->append(p,s*n);return s*n;}
inline std::string _http(const std::string& url,const std::string& method,const std::string& body="",const std::string& token=""){
  CURL* c=curl_easy_init(); if(!c)throw std::runtime_error("curl init failed");
  std::string resp; struct curl_slist* h=nullptr;
  h=curl_slist_append(h,"Content-Type: application/json");
  h=curl_slist_append(h,"User-Agent: HexAuth-Cpp/1.0");
  if(!token.empty())h=curl_slist_append(h,("Authorization: Bearer "+token).c_str());
  curl_easy_setopt(c,CURLOPT_URL,url.c_str()); curl_easy_setopt(c,CURLOPT_HTTPHEADER,h);
  curl_easy_setopt(c,CURLOPT_WRITEFUNCTION,_wcb); curl_easy_setopt(c,CURLOPT_WRITEDATA,&resp);
  curl_easy_setopt(c,CURLOPT_TIMEOUT,10L); curl_easy_setopt(c,CURLOPT_SSL_VERIFYPEER,1L);
  if(method=="POST"){curl_easy_setopt(c,CURLOPT_POST,1L);curl_easy_setopt(c,CURLOPT_POSTFIELDS,body.c_str());curl_easy_setopt(c,CURLOPT_POSTFIELDSIZE,(long)body.size());}
  CURLcode r=curl_easy_perform(c); curl_slist_free_all(h); curl_easy_cleanup(c);
  if(r!=CURLE_OK)return std::string("{\\"ok\\":false,\\"message\\":\\"}")+curl_easy_strerror(r)+"\\"}";
  return resp;
}

inline std::string get_hwid(){
  std::string raw;
#ifdef _WIN32
  char buf[256]={}; DWORD sz=sizeof(buf); GetComputerNameA(buf,&sz); raw+=buf;
#else
  struct utsname u; uname(&u); raw+=std::string(u.nodename)+"|"+u.machine;
#endif
  unsigned char hash[SHA256_DIGEST_LENGTH]; SHA256((const unsigned char*)raw.data(),raw.size(),hash);
  std::ostringstream ss; for(int i=0;i<16;i++)ss<<std::hex<<std::setw(2)<<std::setfill('0')<<(int)hash[i];
  return ss.str();
}

class HexAuth {
public:
  HexAuth(std::string id,std::string sec,std::string v="1.0",std::string ep="https://hexauth.app/api")
    :_app_id(std::move(id)),_app_secret(std::move(sec)),_version(std::move(v)),_endpoint(std::move(ep)),_hwid(get_hwid()){}

  LoginResult login(const std::string& u,const std::string& p){
    std::string body=hexjson::obj({{"appId",_app_id},{"username",u},{"password",p},{"hwid",_hwid},{"version",_version}});
    std::string resp=_http(_endpoint+"/sdk/login","POST",body);
    LoginResult r; r.ok=hexjson::get(resp,"ok")=="true"; r.message=hexjson::get(resp,"message");
    r.session_token=hexjson::get(resp,"sessionToken"); r.user.username=hexjson::get(resp,"username"); r.user.plan=hexjson::get(resp,"plan");
    if(r.ok&&!r.session_token.empty())_session_token=r.session_token; return r;
  }

  LoginResult validate(const std::string& token=""){
    std::string t=token.empty()?_session_token:token; if(t.empty())return{false,"No session token"};
    std::string resp=_http(_endpoint+"/sdk/validate","POST",hexjson::obj({{"sessionToken",t}}));
    LoginResult r; r.ok=hexjson::get(resp,"ok")=="true"; r.message=hexjson::get(resp,"message"); return r;
  }

  Variable get_variable(const std::string& name,const std::string& token=""){
    std::string t=token.empty()?_session_token:token;
    if(t.empty())throw std::runtime_error("Not logged in.");
    std::string resp=_http(_endpoint+"/sdk/variable/"+name,"GET","",t);
    return{hexjson::get(resp,"name"),hexjson::get(resp,"value")};
  }

  static std::string hwid(){return get_hwid();}
private:
  std::string _app_id,_app_secret,_version,_endpoint,_hwid,_session_token;
};
} // namespace hexauth
`,
  },

  java: {
    filename: "HexAuth.java",
    mime: "text/x-java",
    content: `/**
 * HexAuth.java — Hex Auth Java SDK
 * Version: 1.0.0
 * Docs: https://hexauth.app/docs
 *
 * Requires Java 11+. No external dependencies.
 */

package io.hexauth;

import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;

public class HexAuth {

    public static class User {
        public final String username, plan, expiresAt;
        User(String u, String p, String e) { username=u; plan=p; expiresAt=e; }
        @Override public String toString() { return "User{"+username+", plan="+plan+"}"; }
    }

    public static class Variable {
        public final String name, value;
        Variable(String n, String v) { name=n; value=v; }
    }

    public static class LoginResult {
        public final boolean ok;
        public final String message, sessionToken;
        public final User user;
        LoginResult(boolean ok,String m,String t,User u){this.ok=ok;message=m;sessionToken=t;user=u;}
        public boolean isOk(){return ok;}
    }

    public static class HexAuthException extends RuntimeException {
        public HexAuthException(String m){super(m);}
    }

    private static String jGet(String j,String k){
        int p=j.indexOf("\\""+k+"\\""); if(p<0)return "";
        p=j.indexOf(":",p)+1; while(p<j.length()&&Character.isWhitespace(j.charAt(p)))p++;
        if(p>=j.length())return "";
        if(j.charAt(p)=='"'){int e=j.indexOf('"',p+1);return e<0?"":j.substring(p+1,e);}
        int e=p; while(e<j.length()&&",}]\\n".indexOf(j.charAt(e))<0)e++;
        return j.substring(p,e).trim();
    }
    private static String jEsc(String s){return s.replace("\\\\","\\\\\\\\").replace("\\"","\\\\\"");}

    public static String getHwid(){
        try{
            String raw=InetAddress.getLocalHost().getHostName()+"|"+System.getProperty("os.arch","")+"|"+Runtime.getRuntime().availableProcessors();
            byte[] d=MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb=new StringBuilder(); for(int i=0;i<16;i++)sb.append(String.format("%02x",d[i])); return sb.toString();
        }catch(Exception e){return "unknown-hwid";}
    }

    private final String appId,appSecret,version,endpoint,hwid;
    private final HttpClient http;
    private String sessionToken;

    public HexAuth(String appId,String appSecret){this(appId,appSecret,"1.0","https://hexauth.app/api");}
    public HexAuth(String appId,String appSecret,String version,String endpoint){
        this.appId=appId;this.appSecret=appSecret;this.version=version;
        this.endpoint=endpoint.replaceAll("/+$","");this.hwid=getHwid();
        this.http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    private String post(String path,String body)throws Exception{
        var req=HttpRequest.newBuilder().uri(URI.create(endpoint+path))
            .header("Content-Type","application/json").header("User-Agent","HexAuth-Java/1.0 v"+version)
            .POST(HttpRequest.BodyPublishers.ofString(body)).timeout(Duration.ofSeconds(10)).build();
        return http.send(req,HttpResponse.BodyHandlers.ofString()).body();
    }
    private String get(String path,String token)throws Exception{
        var req=HttpRequest.newBuilder().uri(URI.create(endpoint+path))
            .header("User-Agent","HexAuth-Java/1.0 v"+version).header("Authorization","Bearer "+token)
            .GET().timeout(Duration.ofSeconds(10)).build();
        return http.send(req,HttpResponse.BodyHandlers.ofString()).body();
    }

    public LoginResult login(String username,String password){
        String body=String.format("{\\"appId\\":\\"%s\\",\\"username\\":\\"%s\\",\\"password\\":\\"%s\\",\\"hwid\\":\\"%s\\",\\"version\\":\\"%s\\"}",
            jEsc(appId),jEsc(username),jEsc(password),hwid,jEsc(version));
        try{
            String resp=post("/sdk/login",body); boolean ok="true".equals(jGet(resp,"ok"));
            String token=jGet(resp,"sessionToken");
            User user=resp.contains("\\"user\\"")? new User(jGet(resp,"username"),jGet(resp,"plan"),jGet(resp,"expiresAt")):null;
            if(ok&&!token.isEmpty())sessionToken=token;
            return new LoginResult(ok,jGet(resp,"message"),token,user);
        }catch(Exception e){return new LoginResult(false,"Network error: "+e.getMessage(),null,null);}
    }

    public LoginResult validate(){return validate(sessionToken);}
    public LoginResult validate(String token){
        if(token==null||token.isEmpty())return new LoginResult(false,"No session token",null,null);
        try{
            String resp=post("/sdk/validate","{\\"sessionToken\\":\\""+jEsc(token)+"\\"}");
            return new LoginResult("true".equals(jGet(resp,"ok")),jGet(resp,"message"),token,null);
        }catch(Exception e){return new LoginResult(false,"Network error: "+e.getMessage(),null,null);}
    }

    public Variable getVariable(String name){return getVariable(name,sessionToken);}
    public Variable getVariable(String name,String token){
        if(token==null||token.isEmpty())throw new HexAuthException("Not logged in.");
        try{String resp=get("/sdk/variable/"+name,token);return new Variable(jGet(resp,"name"),jGet(resp,"value"));}
        catch(Exception e){throw new HexAuthException("Network error: "+e.getMessage());}
    }
}
`,
  },

  nodejs: {
    filename: "hexauth.js",
    mime: "application/javascript",
    content: `/**
 * hexauth.js — Hex Auth Node.js SDK
 * Version: 1.0.0
 * Docs: https://hexauth.app/docs
 *
 * Requires Node.js 18+ (native fetch). No external dependencies.
 */

"use strict";

const os = require("os");
const crypto = require("crypto");

function getHwid() {
  const parts = [os.hostname(), os.arch(), os.cpus()[0]?.model ?? "", String(os.totalmem())].join("|");
  return crypto.createHash("sha256").update(parts).digest("hex").slice(0, 32);
}

class HexAuthError extends Error {
  constructor(message) { super(message); this.name = "HexAuthError"; }
}

class LoginResult {
  constructor(data) {
    this.ok = Boolean(data.ok);
    this.message = data.message ?? "";
    this.sessionToken = data.sessionToken ?? null;
    this.user = data.user ?? null;
  }
  get username() { return this.user?.username ?? null; }
  get plan() { return this.user?.plan ?? null; }
}

class Variable {
  constructor(data) { this.name = data.name ?? ""; this.value = data.value ?? ""; }
}

class HexAuth {
  constructor({ appId, appSecret, version = "1.0", endpoint = "https://hexauth.app/api", timeout = 10000 } = {}) {
    if (!appId || !appSecret) throw new HexAuthError("appId and appSecret are required");
    this._appId = appId; this._appSecret = appSecret; this._version = version;
    this._endpoint = endpoint.replace(/\\/+$/, ""); this._timeout = timeout;
    this._hwid = getHwid(); this._sessionToken = null;
  }

  async _fetch(method, path, body, token) {
    const url = \`\${this._endpoint}\${path}\`;
    const headers = { "Content-Type": "application/json", "User-Agent": \`HexAuth-Node/1.0 v\${this._version}\` };
    if (token) headers["Authorization"] = \`Bearer \${token}\`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this._timeout);
    try {
      const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctrl.signal });
      clearTimeout(timer);
      return await resp.json();
    } catch (err) {
      clearTimeout(timer);
      return { ok: false, message: err.name === "AbortError" ? "Request timed out" : \`Network error: \${err.message}\` };
    }
  }

  async login({ username, password }) {
    const data = await this._fetch("POST", "/sdk/login", { appId: this._appId, username, password, hwid: this._hwid, version: this._version });
    const result = new LoginResult(data);
    if (result.ok && result.sessionToken) this._sessionToken = result.sessionToken;
    return result;
  }

  async validate(sessionToken) {
    const token = sessionToken ?? this._sessionToken;
    if (!token) return new LoginResult({ ok: false, message: "No session token" });
    return new LoginResult(await this._fetch("POST", "/sdk/validate", { sessionToken: token }));
  }

  async getVariable(name, sessionToken) {
    const token = sessionToken ?? this._sessionToken;
    if (!token) throw new HexAuthError("Not logged in. Call login() first.");
    return new Variable(await this._fetch("GET", \`/sdk/variable/\${encodeURIComponent(name)}\`, null, token));
  }

  static getHwid() { return getHwid(); }
  get sessionToken() { return this._sessionToken; }
}

module.exports = { HexAuth, LoginResult, Variable, HexAuthError, getHwid };
`,
  },

  php: {
    filename: "hexauth.php",
    mime: "text/x-php",
    content: `<?php
/**
 * hexauth.php — Hex Auth PHP SDK
 * Version: 1.0.0
 * Docs: https://hexauth.app/docs
 *
 * Requires PHP 8.0+ with ext-curl and ext-json. No Composer needed.
 */

declare(strict_types=1);

final class HexAuthUser {
    public function __construct(
        public readonly string $username,
        public readonly string $plan,
        public readonly ?string $expiresAt = null,
    ) {}
}

final class HexAuthVariable {
    public function __construct(public readonly string $name, public readonly string $value) {}
}

final class LoginResult {
    public readonly bool $ok;
    public readonly string $message;
    public readonly ?string $sessionToken;
    public readonly ?HexAuthUser $user;

    public function __construct(array $data) {
        $this->ok           = (bool)($data['ok'] ?? false);
        $this->message      = (string)($data['message'] ?? '');
        $this->sessionToken = $data['sessionToken'] ?? null;
        $this->user         = isset($data['user'])
            ? new HexAuthUser($data['user']['username'] ?? '', $data['user']['plan'] ?? 'free', $data['user']['expiresAt'] ?? null)
            : null;
    }
    public function isOk(): bool { return $this->ok; }
}

final class HexAuthException extends \\RuntimeException {}

final class HexAuth {
    private readonly string $hwid;
    private ?string $sessionToken = null;

    public function __construct(
        private readonly string $appId,
        private readonly string $appSecret,
        private readonly string $version  = '1.0',
        private readonly string $endpoint = 'https://hexauth.app/api',
        private readonly int    $timeout  = 10,
    ) { $this->hwid = self::getHwid(); }

    public function login(string $username, string $password): LoginResult {
        $result = new LoginResult($this->post('/sdk/login', ['appId'=>$this->appId,'username'=>$username,'password'=>$password,'hwid'=>$this->hwid,'version'=>$this->version]));
        if ($result->ok && $result->sessionToken !== null) $this->sessionToken = $result->sessionToken;
        return $result;
    }

    public function validate(?string $sessionToken = null): LoginResult {
        $token = $sessionToken ?? $this->sessionToken;
        if ($token === null) return new LoginResult(['ok'=>false,'message'=>'No session token']);
        return new LoginResult($this->post('/sdk/validate', ['sessionToken'=>$token]));
    }

    public function getVariable(string $name, ?string $sessionToken = null): HexAuthVariable {
        $token = $sessionToken ?? $this->sessionToken;
        if ($token === null) throw new HexAuthException('Not logged in.');
        $data = $this->request('GET', "/sdk/variable/{$name}", null, $token);
        return new HexAuthVariable($data['name'] ?? $name, $data['value'] ?? '');
    }

    public static function getHwid(): string {
        $raw = implode('|', [gethostname() ?: '', php_uname('m'), (string)PHP_INT_SIZE]);
        return substr(hash('sha256', $raw), 0, 32);
    }

    private function post(string $path, array $body): array { return $this->request('POST', $path, $body); }

    private function request(string $method, string $path, ?array $body=null, ?string $token=null): array {
        $ch = curl_init(rtrim($this->endpoint,'/').$path);
        $headers = ['Content-Type: application/json',"User-Agent: HexAuth-PHP/1.0 v{$this->version}"];
        if ($token !== null) $headers[] = "Authorization: Bearer {$token}";
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>$headers,CURLOPT_TIMEOUT=>$this->timeout,CURLOPT_SSL_VERIFYPEER=>true]);
        if ($method === 'POST') { curl_setopt($ch, CURLOPT_POST, true); curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body)); }
        $response = curl_exec($ch); $error = curl_error($ch); curl_close($ch);
        if ($response === false) return ['ok'=>false,'message'=>"cURL error: {$error}"];
        return json_decode($response, true) ?? ['ok'=>false,'message'=>'Invalid JSON response'];
    }
}
`,
  },
};

router.get("/downloads/sdk/:lang", (req, res): void => {
  const raw = Array.isArray(req.params.lang) ? req.params.lang[0] : req.params.lang;
  const lang = raw.toLowerCase();
  const sdk = SDK_CONTENT[lang];

  if (!sdk) {
    res.status(404).json({ error: "SDK not found. Available: python, csharp, cpp, java, nodejs, php" });
    return;
  }

  res.setHeader("Content-Type", sdk.mime + "; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${sdk.filename}"`);
  res.send(sdk.content);
});

router.get("/downloads/sdk", (_req, res): void => {
  res.json({
    available: Object.entries(SDK_CONTENT).map(([lang, sdk]) => ({
      lang,
      filename: sdk.filename,
      url: `/api/downloads/sdk/${lang}`,
    })),
  });
});

export default router;
