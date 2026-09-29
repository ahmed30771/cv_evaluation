import httpx
from app.config import settings

url = settings.openrouter_base_url.rstrip("/") + "/chat/completions"
models = [
    "google/gemma-4-31b-it:free",
    "qwen/qwen3.8-27b:free",
    "nvidia/nemotron-3.5-lightning:free",
    "inclusionai/ling-3.0-flash-sante:free",
]
for model in models:
    r = httpx.post(
        url,
        headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
        json={
            "model": model,
            "messages": [{"role": "user", "content": 'Return JSON only: {"ok": true}'}],
            "temperature": 0,
            "max_tokens": 40,
        },
        timeout=60,
    )
    try:
        msg = r.json()["choices"][0]["message"]
        print(model, r.status_code, "content=", repr(msg.get("content"))[:120])
    except Exception:
        print(model, r.status_code, r.text[:220])
