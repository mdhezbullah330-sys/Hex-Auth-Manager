/**
 * HexAuth.java — Hex Auth Java SDK
 * Version: 1.0.0
 * Docs: https://hexauth.app/docs
 *
 * Requires Java 11+ (uses java.net.http.HttpClient)
 * No external dependencies.
 */

package io.hexauth;

import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Optional;

public class HexAuth {

    // ── Data classes ─────────────────────────────────────────────────────────

    public static class User {
        public final String username;
        public final String plan;
        public final String expiresAt;

        User(String username, String plan, String expiresAt) {
            this.username  = username;
            this.plan      = plan;
            this.expiresAt = expiresAt;
        }

        @Override public String toString() {
            return "User{username='" + username + "', plan='" + plan + "'}";
        }
    }

    public static class Variable {
        public final String name;
        public final String value;

        Variable(String name, String value) {
            this.name  = name;
            this.value = value;
        }

        @Override public String toString() {
            return "Variable{" + name + "='" + value + "'}";
        }
    }

    public static class LoginResult {
        public final boolean ok;
        public final String message;
        public final String sessionToken;
        public final User user;

        LoginResult(boolean ok, String message, String sessionToken, User user) {
            this.ok           = ok;
            this.message      = message;
            this.sessionToken = sessionToken;
            this.user         = user;
        }

        public boolean isOk() { return ok; }

        @Override public String toString() {
            return "LoginResult{ok=" + ok + ", user=" + user + "}";
        }
    }

    public static class HexAuthException extends RuntimeException {
        public HexAuthException(String msg) { super(msg); }
    }

    // ── Minimal JSON parser ──────────────────────────────────────────────────

    private static String jsonGet(String json, String key) {
        int pos = json.indexOf("\"" + key + "\"");
        if (pos < 0) return "";
        pos = json.indexOf(":", pos) + 1;
        while (pos < json.length() && Character.isWhitespace(json.charAt(pos))) pos++;
        if (pos >= json.length()) return "";
        char c = json.charAt(pos);
        if (c == '"') {
            int end = json.indexOf('"', pos + 1);
            return end < 0 ? "" : json.substring(pos + 1, end);
        }
        int end = pos;
        while (end < json.length() && ",}]\n".indexOf(json.charAt(end)) < 0) end++;
        return json.substring(pos, end).trim();
    }

    private static String jsonEscape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    // ── HWID ─────────────────────────────────────────────────────────────────

    public static String getHwid() {
        try {
            String raw = InetAddress.getLocalHost().getHostName()
                + "|" + System.getProperty("os.arch", "")
                + "|" + Runtime.getRuntime().availableProcessors();
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 16; i++)
                sb.append(String.format("%02x", digest[i]));
            return sb.toString();
        } catch (Exception e) {
            return "unknown-hwid";
        }
    }

    // ── Client ───────────────────────────────────────────────────────────────

    private final String appId;
    private final String appSecret;
    private final String version;
    private final String endpoint;
    private final String hwid;
    private final HttpClient http;
    private String sessionToken;

    public HexAuth(String appId, String appSecret) {
        this(appId, appSecret, "1.0", "https://hexauth.app/api");
    }

    public HexAuth(String appId, String appSecret, String version, String endpoint) {
        this.appId    = appId;
        this.appSecret = appSecret;
        this.version  = version;
        this.endpoint = endpoint.replaceAll("/+$", "");
        this.hwid     = getHwid();
        this.http     = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    }

    private String post(String path, String body) throws IOException, InterruptedException {
        var req = HttpRequest.newBuilder()
            .uri(URI.create(endpoint + path))
            .header("Content-Type", "application/json")
            .header("User-Agent", "HexAuth-Java/1.0 v" + version)
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .timeout(Duration.ofSeconds(10))
            .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString()).body();
    }

    private String get(String path, String token) throws IOException, InterruptedException {
        var req = HttpRequest.newBuilder()
            .uri(URI.create(endpoint + path))
            .header("User-Agent", "HexAuth-Java/1.0 v" + version)
            .header("Authorization", "Bearer " + token)
            .GET()
            .timeout(Duration.ofSeconds(10))
            .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString()).body();
    }

    /**
     * Authenticate a user. Binds HWID on first login.
     */
    public LoginResult login(String username, String password) {
        String body = String.format(
            "{\"appId\":\"%s\",\"username\":\"%s\",\"password\":\"%s\",\"hwid\":\"%s\",\"version\":\"%s\"}",
            jsonEscape(appId), jsonEscape(username), jsonEscape(password), hwid, jsonEscape(version)
        );
        try {
            String resp = post("/sdk/login", body);
            boolean ok  = "true".equals(jsonGet(resp, "ok"));
            String token = jsonGet(resp, "sessionToken");
            User user = null;
            int uPos = resp.indexOf("\"user\"");
            if (uPos >= 0) {
                user = new User(jsonGet(resp, "username"), jsonGet(resp, "plan"), jsonGet(resp, "expiresAt"));
            }
            if (ok && !token.isEmpty()) sessionToken = token;
            return new LoginResult(ok, jsonGet(resp, "message"), token, user);
        } catch (Exception e) {
            return new LoginResult(false, "Network error: " + e.getMessage(), null, null);
        }
    }

    /**
     * Validate an existing session token.
     */
    public LoginResult validate() { return validate(sessionToken); }

    public LoginResult validate(String token) {
        if (token == null || token.isEmpty())
            return new LoginResult(false, "No session token", null, null);
        try {
            String resp = post("/sdk/validate", "{\"sessionToken\":\"" + jsonEscape(token) + "\"}");
            boolean ok  = "true".equals(jsonGet(resp, "ok"));
            return new LoginResult(ok, jsonGet(resp, "message"), token, null);
        } catch (Exception e) {
            return new LoginResult(false, "Network error: " + e.getMessage(), null, null);
        }
    }

    /**
     * Fetch a remote variable by name. Requires active session.
     */
    public Variable getVariable(String name) { return getVariable(name, sessionToken); }

    public Variable getVariable(String name, String token) {
        if (token == null || token.isEmpty()) throw new HexAuthException("Not logged in.");
        try {
            String resp = get("/sdk/variable/" + name, token);
            return new Variable(jsonGet(resp, "name"), jsonGet(resp, "value"));
        } catch (Exception e) {
            throw new HexAuthException("Network error: " + e.getMessage());
        }
    }
}
