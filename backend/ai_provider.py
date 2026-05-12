import os
from openai import AsyncOpenAI
import httpx

from utils.conversation_store import get_conversation, save_message
AI_PROVIDER = os.getenv("AI_PROVIDER", "openai")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROK_API_KEY = os.getenv("GROK_API_KEY")

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)


async def generate_ai_response(user_message: str) -> str:
    """
    Main AI router.
    Uses MongoDB-backed conversation history (for now under a default user).
    """
    user_id = "default_user"  # TODO: replace with real user ID when you have auth

    # Save latest user message
    save_message(user_id, "user", user_message)

    # Load conversation history
    history = get_conversation(user_id)

    # Build messages for the model
    messages = [
        {
            "role": "system",
            "content": (
                "You are SafeGuard AI, a calm, supportive real-time safety companion. "
                "You remember the user's previous messages and continue the conversation naturally. "
                "You speak clearly, directly, and help the user assess danger. "
                "You NEVER give generic replies. You ask follow-up questions. "
                "You stay with the user and guide them step-by-step. "
                "You do NOT repeat the user's message. "
                "Your tone is warm, steady, and reassuring. "
                "If the user seems scared, you ground them. "
                "If the user is in danger, you give practical, immediate guidance. "
                "Keep responses short, human, and emotionally intelligent."
            ),
        }
    ]

    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add the latest user message again at the end to ensure it's included
    messages.append({"role": "user", "content": user_message})

    try:
        if AI_PROVIDER == "openai":
            reply = await _use_openai(messages)
        elif AI_PROVIDER == "grok":
            reply = await _use_grok(user_message)
        else:
            reply = "I'm here with you. Stay aware of your surroundings and continue safely."
    except Exception as e:
        print("AI ERROR:", e)
        reply = "I'm here with you. Stay aware of your surroundings and continue safely."

    # Save assistant reply
    save_message(user_id, "assistant", reply)

    return reply


async def _use_openai(messages):
    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=200,
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
                        "content": "You generate short, calm safety messages.",
                    },
                    {"role": "user", "content": user_message},
                ],
                "max_tokens": 120,
            },
        )

        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
