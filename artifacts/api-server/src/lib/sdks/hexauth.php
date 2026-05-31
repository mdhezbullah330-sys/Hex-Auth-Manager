<?php
/**
 * hexauth.php — Hex Auth PHP SDK
 * Version: 1.0.0
 * Docs: https://hexauth.app/docs
 *
 * Requires PHP 8.0+ with ext-curl and ext-json
 * No Composer dependencies.
 *
 * Usage:
 *   require_once 'hexauth.php';
 *   $api = new HexAuth(app_id: 'YOUR_APP_ID', app_secret: 'YOUR_SECRET');
 *   $result = $api->login('username', 'password');
 */

declare(strict_types=1);

// ── Data classes ──────────────────────────────────────────────────────────────

final class HexAuthUser
{
    public function __construct(
        public readonly string $username,
        public readonly string $plan,
        public readonly ?string $expiresAt = null,
    ) {}

    public function __toString(): string
    {
        return "HexAuthUser({$this->username}, plan={$this->plan})";
    }
}

final class HexAuthVariable
{
    public function __construct(
        public readonly string $name,
        public readonly string $value,
    ) {}

    public function __toString(): string
    {
        return "{$this->name}={$this->value}";
    }
}

final class LoginResult
{
    public readonly bool $ok;
    public readonly string $message;
    public readonly ?string $sessionToken;
    public readonly ?HexAuthUser $user;

    public function __construct(array $data)
    {
        $this->ok           = (bool) ($data['ok'] ?? false);
        $this->message      = (string) ($data['message'] ?? '');
        $this->sessionToken = $data['sessionToken'] ?? null;
        $this->user         = isset($data['user'])
            ? new HexAuthUser(
                $data['user']['username'] ?? '',
                $data['user']['plan'] ?? 'free',
                $data['user']['expiresAt'] ?? null,
              )
            : null;
    }

    public function isOk(): bool { return $this->ok; }
}

// ── Exception ─────────────────────────────────────────────────────────────────

final class HexAuthException extends RuntimeException {}

// ── SDK Client ────────────────────────────────────────────────────────────────

final class HexAuth
{
    private readonly string $hwid;
    private ?string $sessionToken = null;

    public function __construct(
        private readonly string $appId,
        private readonly string $appSecret,
        private readonly string $version  = '1.0',
        private readonly string $endpoint = 'https://hexauth.app/api',
        private readonly int    $timeout  = 10,
    ) {
        $this->hwid = self::getHwid();
    }

    // ── Auth ─────────────────────────────────────────────────────────────────

    /**
     * Authenticate a user. Binds HWID on first login.
     */
    public function login(string $username, string $password): LoginResult
    {
        $data = $this->post('/sdk/login', [
            'appId'    => $this->appId,
            'username' => $username,
            'password' => $password,
            'hwid'     => $this->hwid,
            'version'  => $this->version,
        ]);

        $result = new LoginResult($data);
        if ($result->ok && $result->sessionToken !== null) {
            $this->sessionToken = $result->sessionToken;
        }
        return $result;
    }

    /**
     * Validate an existing session token.
     */
    public function validate(?string $sessionToken = null): LoginResult
    {
        $token = $sessionToken ?? $this->sessionToken;
        if ($token === null) {
            return new LoginResult(['ok' => false, 'message' => 'No session token']);
        }
        return new LoginResult($this->post('/sdk/validate', ['sessionToken' => $token]));
    }

    /**
     * Fetch a remote variable by name. Requires active session.
     */
    public function getVariable(string $name, ?string $sessionToken = null): HexAuthVariable
    {
        $token = $sessionToken ?? $this->sessionToken;
        if ($token === null) {
            throw new HexAuthException('Not logged in. Call login() first.');
        }
        $data = $this->get("/sdk/variable/{$name}", $token);
        return new HexAuthVariable($data['name'] ?? $name, $data['value'] ?? '');
    }

    // ── HWID ─────────────────────────────────────────────────────────────────

    public static function getHwid(): string
    {
        $raw = implode('|', [
            gethostname() ?: '',
            php_uname('m'),
            (string) PHP_INT_SIZE,
        ]);
        return substr(hash('sha256', $raw), 0, 32);
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private function post(string $path, array $body): array
    {
        return $this->request('POST', $path, $body);
    }

    private function get(string $path, string $token): array
    {
        return $this->request('GET', $path, null, $token);
    }

    private function request(string $method, string $path, ?array $body = null, ?string $token = null): array
    {
        $url = rtrim($this->endpoint, '/') . $path;
        $ch  = curl_init($url);

        $headers = [
            'Content-Type: application/json',
            "User-Agent: HexAuth-PHP/1.0 v{$this->version}",
        ];
        if ($token !== null) {
            $headers[] = "Authorization: Bearer {$token}";
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => $this->timeout,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $response = curl_exec($ch);
        $error    = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            return ['ok' => false, 'message' => "cURL error: {$error}"];
        }

        return json_decode($response, true) ?? ['ok' => false, 'message' => 'Invalid JSON response'];
    }
}

// ── Quick-start example ───────────────────────────────────────────────────────
// require_once 'hexauth.php';
//
// $api = new HexAuth(
//     appId: 'YOUR_APP_ID',
//     appSecret: 'YOUR_SECRET',
//     version: '1.0',
// );
//
// $result = $api->login('developer123', 'secure_password');
// if ($result->isOk()) {
//     echo "Welcome {$result->user->username}! Plan: {$result->user->plan}\n";
//     $v = $api->getVariable('download_url');
//     echo "Download: {$v->value}\n";
// } else {
//     echo "Auth failed: {$result->message}\n";
// }
