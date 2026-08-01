"""String helper utilities for slug generation and formatting."""

import re
import secrets
import string


def slugify(text: str) -> str:
    """Converts string title to URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text


def generate_random_token(length: int = 32) -> str:
    """Generates secure random string token."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))
