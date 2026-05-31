/// <summary>
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
using System.Text.Json;
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

        /// <summary>Authenticate a user. Binds HWID on first login.</summary>
        public async Task<LoginResult> LoginAsync(string username, string password)
        {
            var payload = new
            {
                appId = _appId,
                username,
                password,
                hwid = _hwid,
                version = _version,
            };

            using var resp = await _http.PostAsJsonAsync("sdk/login", payload);
            var result = await resp.Content.ReadFromJsonAsync<LoginResult>()
                ?? throw new HexAuthException("Empty response from server");

            if (result.Ok && result.SessionToken != null)
                _sessionToken = result.SessionToken;

            return result;
        }

        /// <summary>Validate an existing session token.</summary>
        public async Task<LoginResult> ValidateAsync(string? sessionToken = null)
        {
            var token = sessionToken ?? _sessionToken
                ?? throw new HexAuthException("No session token. Call LoginAsync() first.");

            using var resp = await _http.PostAsJsonAsync("sdk/validate", new { sessionToken = token });
            return await resp.Content.ReadFromJsonAsync<LoginResult>()
                ?? throw new HexAuthException("Empty response");
        }

        /// <summary>Fetch a remote variable by name. Requires an active session.</summary>
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

        /// <summary>Returns the hardware ID of the current machine.</summary>
        public static string GetHwid()
        {
            var parts = new[]
            {
                Environment.MachineName,
                RuntimeInformation.OSArchitecture.ToString(),
                Environment.ProcessorCount.ToString(),
            };
            var raw = string.Join("|", parts);
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
            return Convert.ToHexString(bytes)[..32].ToLower();
        }

        public void Dispose() => _http.Dispose();
    }
}

// ── Quick-start example ──────────────────────────────────────────────────────
// using HexAuth;
//
// using var api = new HexAuthClient(
//     appId: "YOUR_APP_ID",
//     appSecret: "YOUR_SECRET",
//     version: "1.0"
// );
//
// var result = await api.LoginAsync("developer123", "secure_password");
// if (result.Ok)
// {
//     Console.WriteLine($"Welcome {result.User!.Username}! Plan: {result.User.Plan}");
//     var v = await api.GetVariableAsync("download_url");
//     Console.WriteLine($"Download URL: {v.Value}");
// }
// else Console.WriteLine($"Auth failed: {result.Message}");
