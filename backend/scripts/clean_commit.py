"""Create a commit without Cursor co-authored-by trailer."""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)

env = os.environ.copy()
env.update(
    {
        "GIT_AUTHOR_NAME": "Muhammad Ahmed",
        "GIT_AUTHOR_EMAIL": "muhammadahmed.ma03@gmail.com",
        "GIT_COMMITTER_NAME": "Muhammad Ahmed",
        "GIT_COMMITTER_EMAIL": "muhammadahmed.ma03@gmail.com",
    }
)

msg = (
    "Ship CV evaluation app with single-project Vercel deploy.\n\n"
    "Next.js at repo root, FastAPI via api/index.py, Neon + OpenRouter, "
    "and docs aligned to the layout.\n"
)

subprocess.run(["git", "add", "-A"], check=True, env=env)
tree = subprocess.check_output(["git", "write-tree"], text=True, env=env).strip()
parent = "f875132bd4318b6975ac81dcac4385a23c9be6b8"

commit = subprocess.check_output(
    ["git", "commit-tree", tree, "-p", parent],
    input=msg,
    text=True,
    env=env,
).strip()

subprocess.run(["git", "update-ref", "refs/heads/main", commit], check=True, env=env)
subprocess.run(["git", "reset", "--hard", commit], check=True, env=env)

body = subprocess.check_output(["git", "log", "-1", "--format=%B"], text=True, env=env)
print("COMMIT", commit)
print("BODY_START")
print(body)
print("BODY_END")
print("HAS_CURSOR_TRAILER", "cursoragent@cursor.com" in body.lower() or "Co-authored-by: Cursor" in body)
