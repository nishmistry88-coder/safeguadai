from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from twilio.rest import Client
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import os
import logging
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
import tempfile
import aiofiles
import json
import time

# ==================== ENV + ROOT DIR ====================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ==================== DATABASE ====================

mongo_url = os.getenv("MONGO_URL")
if not mongo_url:
    raise RuntimeError("MONGO_URL is not set in environment")

client = AsyncIOMotorClient(mongo_url)

db_name = os.getenv("DB_NAME")
if not db_name:
    raise RuntimeError("DB_NAME is not set in environment")

db = client[db_name]

# ==================== JWT CONFIG ====================

JWT_SECRET = os.environ.get("JWT_SECRET", "safeguard_secret_key")
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

# ==================== TWILIO CONFIG ====================

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

def get_twilio_client() -> Optional[Client]:
    """Return Twilio client if credentials exist, else None."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        return None
    return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# ==================== FASTAPI APP ====================

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SafeGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://safeguadai-frontend.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== ASSISTANT ENDPOINT ====================

from openai import OpenAI

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class AssistantMessage(BaseModel):
    message: str

@app.post("/assistant")
async def assistant_endpoint(payload: AssistantMessage):
    user_message = payload.message

    try:
        completion = openai_client.chat.completions.create(
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
            ]
        )

        reply = completion.choices[0].message.content
        return {"reply": reply}

    except Exception as e:
        print("OpenAI ERROR:", e)
        raise HTTPException(status_code=500, detail="Assistant failed to generate a response.")

# ==================== ROOT ENDPOINT ====================

_start_time = time.time()

@app.get("/")
def read_root():
    uptime_seconds = int(time.time() - _start_time)
    return {
        "status": "ok",
        "service": "safeguard-backend",
        "version": "0.0.3",
        "uptime_seconds": uptime_seconds
    }

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    created_at: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class EmergencyContact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    phone: str
    relationship: str
    is_primary: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EmergencyContactCreate(BaseModel):
    name: str
    phone: str
    relationship: str
    is_primary: bool = False

class SOSAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    latitude: float
    longitude: float
    threat_level: str = "high"
    message: Optional[str] = None
    trigger_source: str = "manual"  # manual, voice, checkin, shake, shutdown, battery
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "active"

class SOSAlertCreate(BaseModel):
    latitude: float
    longitude: float
    message: Optional[str] = None
    trigger_source: str = "manual"

class LocationHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    latitude: float
    longitude: float
    battery_level: Optional[int] = None
    is_emergency: bool = False
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LocationCreate(BaseModel):
    latitude: float
    longitude: float
    battery_level: Optional[int] = None
    is_emergency: bool = False

class ThreatAnalysisResponse(BaseModel):
    is_threat: bool
    threat_level: str
    threat_type: Optional[str] = None
    transcription: str
    detected_language: Optional[str] = None
    confidence: float
    recommended_action: str

class FakeCallContact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    phone: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FakeCallContactCreate(BaseModel):
    name: str
    phone: str

# ==================== NEW MODELS FOR SAFETY FEATURES ====================

class UserSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    # Location/Country
    country_code: str = "US"  # ISO 3166-1 alpha-2 country code
    # Voice Activation
    voice_activation_enabled: bool = False
    activation_phrase: str = "Help me"
    # Going Out Mode
    going_out_presets: Dict[str, bool] = Field(default_factory=lambda: {
        "club": False, "festival": False, "date": False, "walking": False, "travel": False
    })
    # Check-in settings
    checkin_interval: int = 30  # minutes
    checkin_enabled: bool = True
    # Triggers
    shake_detection_enabled: bool = False
    auto_record_on_trigger: bool = False
    trigger_fake_call: bool = False
    # Battery settings
    low_battery_warning: bool = True
    send_location_on_low_battery: bool = True
    low_battery_threshold: int = 20
    critical_battery_threshold: int = 5
    # Shutdown settings
    shutdown_alert_enabled: bool = True
    send_location_on_shutdown: bool = True
    # Voice verification
    voice_verify_to_disable: bool = True
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserSettingsUpdate(BaseModel):
    country_code: Optional[str] = None
    voice_activation_enabled: Optional[bool] = None
    activation_phrase: Optional[str] = None
    going_out_presets: Optional[Dict[str, bool]] = None
    checkin_interval: Optional[int] = None
    checkin_enabled: Optional[bool] = None
    shake_detection_enabled: Optional[bool] = None
    auto_record_on_trigger: Optional[bool] = None
    trigger_fake_call: Optional[bool] = None
    low_battery_warning: Optional[bool] = None
    send_location_on_low_battery: Optional[bool] = None
    low_battery_threshold: Optional[int] = None
    critical_battery_threshold: Optional[int] = None
    shutdown_alert_enabled: Optional[bool] = None
    send_location_on_shutdown: Optional[bool] = None
    voice_verify_to_disable: Optional[bool] = None

class GoingOutSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    preset: str  # club, festival, date, walking, travel
    is_active: bool = True
    voice_activation_enabled: bool = False
    shake_detection_enabled: bool = False
    auto_record_enabled: bool = False
    checkin_enabled: bool = True
    checkin_interval: int = 30
    last_checkin: Optional[str] = None
    next_checkin_due: Optional[str] = None
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    ended_at: Optional[str] = None
    ended_reason: Optional[str] = None  # manual, voice_verified, timeout, emergency

class GoingOutSessionCreate(BaseModel):
    preset: str
    voice_activation_enabled: bool = False
    shake_detection_enabled: bool = False
    auto_record_enabled: bool = False
    checkin_enabled: bool = True
    checkin_interval: int = 30

class CheckinResponse(BaseModel):
    is_safe: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class VoicePhraseVerification(BaseModel):
    phrase_detected: str
    is_match: bool
    confidence: float

class BatteryStatus(BaseModel):
    level: int
    is_charging: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None

# ==================== JOURNEY SHARING MODELS ====================

def generate_share_token():
    """Generate a short, URL-safe token for sharing"""
    import secrets
    return secrets.token_urlsafe(8)

class JourneyShare(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    share_token: str = Field(default_factory=generate_share_token)
    is_active: bool = True
    preset: Optional[str] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    battery_level: Optional[int] = None
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    ended_at: Optional[str] = None
    expires_at: Optional[str] = None  # Auto-expire after X hours

class JourneyShareCreate(BaseModel):
    preset: Optional[str] = None
    duration_hours: int = 4  # Default 4 hour expiry
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class JourneyLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    battery_level: Optional[int] = None

class JourneySharePublic(BaseModel):
    """Public view of journey - no sensitive data"""
    user_name: str
    preset: Optional[str] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    battery_level: Optional[int] = None
    last_updated: str
    started_at: str
    is_active: bool

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ==================== AUTH ROUTES ====================

@app.post("/auth/signup", response_model=TokenResponse)
async def signup(user: UserCreate):
    # Check if user already exists
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(user.password)
    now = datetime.now(timezone.utc).isoformat()

    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hashed_pw,
        "name": user.name,
        "created_at": now,
    }

    await db.users.insert_one(user_doc)

    # Create default settings for this user
    settings = UserSettings(user_id=user_id)
    await db.settings.insert_one(settings.model_dump())

    token = create_token(user_id)

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user.email,
            name=user.name,
            created_at=now,
        ),
    )


@app.post("/auth/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await db.users.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = user["id"]
    token = create_token(user_id)

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user.get("name", ""),
            created_at=user.get("created_at", ""),
        ),
    )


@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user.get("name", ""),
        created_at=current_user.get("created_at", ""),
    )