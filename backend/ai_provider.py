import os
from openai import OpenAI
import httpx

AI_PROVIDER = os.getenv("AI_PROVIDER", "openai")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROK_API_KEY = os.getenv("GROK_API_KEY")

openai_client = OpenAI(api_key=OPENAI_API_KEY)


async def generate_ai_response(user_message: str) -> str:
    """
    Main AI router.
    Switches between OpenAI, Grok, or fallback.
    """
    if AI_PROVIDER == "openai":
        return await _use_openai(user_message)

    if AI_PROVIDER == "grok":
        return await _use_grok(user_message)

    # fallback if no provider works
    return "I'm here with you. Stay aware of your surroundings and continue safely."


async def _use_openai(user_message: str) -> str:
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are SafeGuard AI, a calm, supportive safety companion. "
                    "You speak clearly and simply. You never repeat the user's message. "
                    "You help users understand safety features, alerts, emergency contacts, "
                    "and how the app works. Your tone is warm, steady, and reassuring."
                )
            },
            {"role": "user", "content": user_message}
        ],
        max_tokens=120
    )

    return response.choices[0].message.content.strip()


async def _use_grok(user_message: str) -> str:
    """
    Placeholder Grok integration.
    When you're ready, plug in the real endpoint.
    """
    if not GROK_API_KEY:
        return "Stay alert. I'm here with you."

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROK_API_KEY}"},
            json={
                "model": "grok-2-latest",
                "messages": [
                    {
                        "role": "system",
                        "content": "You generate short, calm safety messages."
                    },
                    {"role": "user", "content": user_message}
                ],
                "max_tokens": 120
            }
        )

        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
