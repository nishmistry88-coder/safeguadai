from datetime import datetime
from database import db

CONVO_LIMIT = 10

def get_conversation(user_id: str):
    convo = db.conversations.find_one({"user_id": user_id})
    if not convo:
        return []
    return convo["messages"]

def save_message(user_id: str, role: str, content: str):
    message = {
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow()
    }

    convo = db.conversations.find_one({"user_id": user_id})

    if not convo:
        db.conversations.insert_one({
            "user_id": user_id,
            "messages": [message]
        })
    else:
        messages = convo["messages"]
        messages.append(message)
        messages = messages[-CONVO_LIMIT:]

        db.conversations.update_one(
            {"user_id": user_id},
            {"$set": {"messages": messages}}
        )
