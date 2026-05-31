/**
 * hexauth.h — Hex Auth C++ SDK
 * Version: 1.0.0
 * Docs: https://hexauth.app/docs
 *
 * Dependencies: libcurl, nlohmann/json
 * Compile: g++ -std=c++17 main.cpp -lcurl -o app
 */

#pragma once

#include <string>
#include <optional>
#include <stdexcept>
#include <sstream>
#include <iomanip>
#include <openssl/sha.h>
#include <curl/curl.h>

#ifdef _WIN32
  #include <windows.h>
#else
  #include <sys/utsname.h>
  #include <unistd.h>
#endif

// ── Minimal JSON helpers (no external dep version) ───────────────────────────
namespace hexjson {
  inline std::string escape(const std::string& s) {
    std::string out;
    for (char c : s) {
      if (c == '"')  out += "\\\"";
      else if (c == '\\') out += "\\\\";
      else out += c;
    }
    return out;
  }

  inline std::string obj(std::initializer_list<std::pair<std::string,std::string>> fields) {
    std::string o = "{";
    bool first = true;
    for (auto& [k, v] : fields) {
      if (!first) o += ",";
      o += "\"" + k + "\":\"" + escape(v) + "\"";
      first = false;
    }
    return o + "}";
  }

  inline std::string get(const std::string& json, const std::string& key) {
    auto pos = json.find("\"" + key + "\"");
    if (pos == std::string::npos) return "";
    pos = json.find(":", pos);
    if (pos == std::string::npos) return "";
    pos++;
    while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\n')) pos++;
    if (pos < json.size() && json[pos] == '"') {
      pos++;
      std::string val;
      while (pos < json.size() && json[pos] != '"') {
        if (json[pos] == '\\') pos++;
        if (pos < json.size()) val += json[pos++];
        else break;
      }
      return val;
    }
    if (pos < json.size() && json[pos] == 't') return "true";
    if (pos < json.size() && json[pos] == 'f') return "false";
    std::string val;
    while (pos < json.size() && json[pos] != ',' && json[pos] != '}' && json[pos] != '\n')
      val += json[pos++];
    return val;
  }
}

namespace hexauth {

// ── Types ────────────────────────────────────────────────────────────────────

struct User {
  std::string username;
  std::string plan;
  std::string expires_at;
};

struct Variable {
  std::string name;
  std::string value;
};

struct LoginResult {
  bool ok = false;
  std::string message;
  std::string session_token;
  User user;

  explicit operator bool() const { return ok; }
};

// ── HTTP helper ──────────────────────────────────────────────────────────────

inline size_t _write_cb(char* ptr, size_t size, size_t nmemb, std::string* out) {
  out->append(ptr, size * nmemb);
  return size * nmemb;
}

inline std::string _http(const std::string& url, const std::string& method,
                         const std::string& body = "", const std::string& token = "") {
  CURL* curl = curl_easy_init();
  if (!curl) throw std::runtime_error("curl_easy_init failed");

  std::string response;
  struct curl_slist* headers = nullptr;
  headers = curl_slist_append(headers, "Content-Type: application/json");
  headers = curl_slist_append(headers, "User-Agent: HexAuth-Cpp/1.0");
  if (!token.empty())
    headers = curl_slist_append(headers, ("Authorization: Bearer " + token).c_str());

  curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, _write_cb);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
  curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);

  if (method == "POST") {
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)body.size());
  }

  CURLcode res = curl_easy_perform(curl);
  curl_slist_free_all(headers);
  curl_easy_cleanup(curl);

  if (res != CURLE_OK)
    return R"({"ok":false,"message":")" + std::string(curl_easy_strerror(res)) + "\"}";
  return response;
}

// ── HWID ─────────────────────────────────────────────────────────────────────

inline std::string get_hwid() {
  std::string raw;
#ifdef _WIN32
  char buf[256] = {};
  DWORD sz = sizeof(buf);
  GetComputerNameA(buf, &sz);
  raw += buf;
#else
  struct utsname uts;
  uname(&uts);
  raw += std::string(uts.nodename) + "|" + uts.machine;
#endif
  unsigned char hash[SHA256_DIGEST_LENGTH];
  SHA256(reinterpret_cast<const unsigned char*>(raw.data()), raw.size(), hash);
  std::ostringstream ss;
  for (int i = 0; i < 16; i++)
    ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
  return ss.str();
}

// ── SDK Client ───────────────────────────────────────────────────────────────

class HexAuth {
public:
  explicit HexAuth(
    std::string app_id,
    std::string app_secret,
    std::string version = "1.0",
    std::string endpoint = "https://hexauth.app/api"
  ) : _app_id(std::move(app_id)),
      _app_secret(std::move(app_secret)),
      _version(std::move(version)),
      _endpoint(std::move(endpoint)),
      _hwid(get_hwid()) {}

  /**
   * Authenticate a user. Binds HWID on first login.
   */
  LoginResult login(const std::string& username, const std::string& password) {
    std::string body = hexjson::obj({
      {"appId",    _app_id},
      {"username", username},
      {"password", password},
      {"hwid",     _hwid},
      {"version",  _version},
    });

    std::string resp = _http(_endpoint + "/sdk/login", "POST", body);
    LoginResult r;
    r.ok            = hexjson::get(resp, "ok") == "true";
    r.message       = hexjson::get(resp, "message");
    r.session_token = hexjson::get(resp, "sessionToken");
    r.user.username = hexjson::get(resp, "username");
    r.user.plan     = hexjson::get(resp, "plan");

    if (r.ok && !r.session_token.empty())
      _session_token = r.session_token;

    return r;
  }

  /**
   * Validate an existing session token.
   */
  LoginResult validate(const std::string& token = "") {
    std::string t = token.empty() ? _session_token : token;
    if (t.empty()) return {false, "No session token"};
    std::string body = hexjson::obj({{"sessionToken", t}});
    std::string resp = _http(_endpoint + "/sdk/validate", "POST", body);
    LoginResult r;
    r.ok      = hexjson::get(resp, "ok") == "true";
    r.message = hexjson::get(resp, "message");
    return r;
  }

  /**
   * Fetch a remote variable by name. Requires active session.
   */
  Variable get_variable(const std::string& name, const std::string& token = "") {
    std::string t = token.empty() ? _session_token : token;
    if (t.empty()) throw std::runtime_error("Not logged in. Call login() first.");
    std::string resp = _http(_endpoint + "/sdk/variable/" + name, "GET", "", t);
    return {hexjson::get(resp, "name"), hexjson::get(resp, "value")};
  }

  static std::string hwid() { return get_hwid(); }

private:
  std::string _app_id, _app_secret, _version, _endpoint, _hwid;
  std::string _session_token;
};

} // namespace hexauth
