"""tests/test_secrets.py
Security test: verifies that .env.example, frontend configuration, and repo assets
contain NO real-looking secrets, API keys, or private tokens.
"""

import re
from pathlib import Path

SUSPICIOUS_PATTERNS = [
    re.compile(r"AKIA[0-9A-Z]{16}"),  # Real AWS Access Key ID
    re.compile(r"sb_secret_[a-zA-Z0-9_\-]{20,}"),  # Supabase secret service-role key
    re.compile(r"eyJh[a-zA-Z0-9_\-]{30,}\.eyJh[a-zA-Z0-9_\-]{30,}"),  # Raw JWT tokens
]


def test_env_example_has_no_real_secrets():
    repo_root = Path(__file__).resolve().parent.parent
    env_examples = [
        repo_root / ".env.example",
        repo_root / "backend" / ".env.example",
        repo_root / "frontend" / ".env.example",
    ]

    for env_path in env_examples:
        if not env_path.exists():
            continue
        content = env_path.read_text(encoding="utf-8")
        for line in content.splitlines():
            trimmed = line.strip()
            if not trimmed or trimmed.startswith("#"):
                continue
            for pattern in SUSPICIOUS_PATTERNS:
                assert not pattern.search(trimmed), f"Real secret pattern found in {env_path.name}: {trimmed}"


def test_built_frontend_bundle_has_no_secrets():
    repo_root = Path(__file__).resolve().parent.parent
    dist_assets = list((repo_root / "frontend" / "dist" / "assets").glob("*.js"))
    if not dist_assets:
        dist_assets = list((repo_root / "dist" / "assets").glob("*.js"))

    for js_file in dist_assets:
        content = js_file.read_text(encoding="utf-8")
        assert "AKIA" not in content, f"Possible AWS Key found in built bundle: {js_file.name}"
        assert "sb_secret_" not in content, f"Supabase service role secret found in built bundle: {js_file.name}"
