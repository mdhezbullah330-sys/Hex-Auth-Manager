"""
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
        # Try to get disk serial on Windows
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
        """
        Authenticate a user. Binds HWID on first login.

        Returns:
            LoginResult with .ok, .user, .session_token, .message
        """
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
        """
        Validate an existing session token.
        Uses the token from the last login() call if not provided.
        """
        token = session_token or self._session_token
        if not token:
            return LoginResult({"ok": False, "message": "No session token"})
        data = self._request("POST", "/sdk/validate", {"sessionToken": token})
        return LoginResult(data)

    def get_variable(self, name: str, session_token: Optional[str] = None) -> Variable:
        """
        Fetch a remote variable by name.
        Requires an active session.
        """
        token = session_token or self._session_token
        if not token:
            raise HexAuthError("Not logged in. Call login() first.")
        data = self._request("GET", f"/sdk/variable/{name}", token=token)
        return Variable(data)

    @staticmethod
    def get_hwid() -> str:
        """Return the hardware ID of the current machine."""
        return _get_hwid()


# ── Quick-start example ──────────────────────────────────────────────────────
if __name__ == "__main__":
    import getpass

    api = HexAuth(
        app_id=input("App ID: "),
        app_secret=input("App Secret: "),
        version="1.0",
    )

    username = input("Username: ")
    password = getpass.getpass("Password: ")

    result = api.login(username, password)
    if result.ok:
        print(f"\n✓ Welcome {result.user.username}! Plan: {result.user.plan}")
    else:
        print(f"\n✗ Login failed: {result.message}")
        sys.exit(1)
