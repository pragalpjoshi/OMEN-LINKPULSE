from urllib.parse import urlsplit
import ipaddress
from fastapi import HTTPException
def validate_destination_url(value: str) -> str:
    """Accept public HTTP(S) destinations and reject obvious unsafe targets."""
    raw = value.strip()
    try:
        parsed = urlsplit(raw)
        if parsed.scheme.lower() not in {"http", "https"}:
            raise ValueError("Only HTTP and HTTPS URLs are supported.")
        host = parsed.hostname
        if not host:
            raise ValueError("A hostname is required.")
        if parsed.username is not None or parsed.password is not None:
            raise ValueError("URLs containing embedded credentials are not allowed.")
        host = host.rstrip(".").lower()
        if (
            host == "localhost"
            or host.endswith(".localhost")
            or host.endswith(".local")
        ):
            raise ValueError("Local hostnames are not allowed.")
        try:
            address = ipaddress.ip_address(host)
        except ValueError:
            if not host or any(char.isspace() for char in host):
                raise ValueError("Invalid hostname.")
        else:
            if not address.is_global:
                raise ValueError("Private or reserved IP destinations are not allowed.")
        port = parsed.port
        if port is not None and not 1 <= port <= 65535:
            raise ValueError("Invalid port.")
    except (ValueError, UnicodeError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid destination URL: {exc}",
        ) from exc
    return raw