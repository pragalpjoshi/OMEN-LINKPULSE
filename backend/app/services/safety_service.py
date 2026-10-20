import re
from urllib.parse import urlparse

SUSPICIOUS_KEYWORDS = {
    "login-verify", "account-update", "free-crypto", "airdrop-claim",
    "wallet-connect", "bank-secure", "password-reset-urgent", "verify-id",
}
RISKY_TLDS = {".zip", ".mov", ".tk", ".ml", ".ga", ".cf", ".gq", ".top", ".xyz"}
IP_HOST_REGEX = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")


def analyze_url_safety(url: str) -> dict:
    if not url:
        return {"is_flagged": False, "risk_score": 0, "flag_reason": None}

    parsed = urlparse(url.strip())
    host = (parsed.hostname or "").lower()
    full_lower = url.lower()

    reasons = []
    score = 0

    if IP_HOST_REGEX.match(host):
        score += 65
        reasons.append("Uses raw IP address instead of a domain name")

    if "xn--" in host:
        score += 55
        reasons.append("Contains punycode/homograph domain characters")

    if any(host.endswith(tld) for tld in RISKY_TLDS):
        score += 40
        reasons.append("Uses a high-risk top-level domain")

    matched_kw = [kw for kw in SUSPICIOUS_KEYWORDS if kw in full_lower]
    if matched_kw:
        score += 50
        reasons.append(f"Contains suspicious pattern ({matched_kw[0]})")

    if "@" in parsed.netloc:
        score += 60
        reasons.append("Contains deceptive '@' credential prefix in URL")

    return {
        "is_flagged": score >= 40,
        "risk_score": min(score, 100),
        "flag_reason": "; ".join(reasons) if reasons else None,
    }