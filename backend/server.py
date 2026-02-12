from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
from emergentintegrations.llm.openai import OpenAISpeechToText
from emergentintegrations.llm.chat import LlmChat, UserMessage
import tempfile
import aiofiles
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'safeguard_secret_key')
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

# Create the main app
app = FastAPI(title="SafeGuard API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create default settings for user
    default_settings = UserSettings(user_id=user_id)
    await db.user_settings.insert_one(default_settings.model_dump())
    
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ==================== USER SETTINGS ====================

@api_router.get("/settings", response_model=UserSettings)
async def get_user_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.user_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings:
        # Create default settings if not exists
        default_settings = UserSettings(user_id=current_user["id"])
        await db.user_settings.insert_one(default_settings.model_dump())
        return default_settings
    return UserSettings(**settings)

@api_router.put("/settings", response_model=UserSettings)
async def update_user_settings(settings_data: UserSettingsUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.user_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        # Create settings if not exists
        default_settings = UserSettings(user_id=current_user["id"], **update_dict)
        await db.user_settings.insert_one(default_settings.model_dump())
        return default_settings
    
    settings = await db.user_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return UserSettings(**settings)

# ==================== GOING OUT MODE ====================

@api_router.post("/going-out/start", response_model=GoingOutSession)
async def start_going_out_session(session_data: GoingOutSessionCreate, current_user: dict = Depends(get_current_user)):
    # End any existing active session
    await db.going_out_sessions.update_many(
        {"user_id": current_user["id"], "is_active": True},
        {"$set": {"is_active": False, "ended_at": datetime.now(timezone.utc).isoformat(), "ended_reason": "new_session"}}
    )
    
    now = datetime.now(timezone.utc)
    next_checkin = None
    if session_data.checkin_enabled:
        from datetime import timedelta
        next_checkin = (now + timedelta(minutes=session_data.checkin_interval)).isoformat()
    
    session = GoingOutSession(
        user_id=current_user["id"],
        preset=session_data.preset,
        voice_activation_enabled=session_data.voice_activation_enabled,
        shake_detection_enabled=session_data.shake_detection_enabled,
        auto_record_enabled=session_data.auto_record_enabled,
        checkin_enabled=session_data.checkin_enabled,
        checkin_interval=session_data.checkin_interval,
        last_checkin=now.isoformat(),
        next_checkin_due=next_checkin
    )
    await db.going_out_sessions.insert_one(session.model_dump())
    
    logger.info(f"Going Out Mode started for user {current_user['name']} - Preset: {session_data.preset}")
    return session

@api_router.get("/going-out/active", response_model=Optional[GoingOutSession])
async def get_active_going_out_session(current_user: dict = Depends(get_current_user)):
    session = await db.going_out_sessions.find_one(
        {"user_id": current_user["id"], "is_active": True},
        {"_id": 0}
    )
    if session:
        return GoingOutSession(**session)
    return None

@api_router.post("/going-out/end")
async def end_going_out_session(current_user: dict = Depends(get_current_user)):
    result = await db.going_out_sessions.update_one(
        {"user_id": current_user["id"], "is_active": True},
        {"$set": {
            "is_active": False,
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "ended_reason": "manual"
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No active session found")
    return {"message": "Going Out Mode ended"}

@api_router.post("/going-out/verify-voice")
async def verify_voice_to_end_session(
    audio: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Verify voice phrase to disable Going Out Mode"""
    
    # Get user settings for activation phrase
    settings = await db.user_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    activation_phrase = settings.get("activation_phrase", "Help me").lower()
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        suffix = Path(audio.filename).suffix if audio.filename else ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        stt = OpenAISpeechToText(api_key=api_key)
        with open(tmp_path, "rb") as audio_file:
            transcription_response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json"
            )
        
        transcription = transcription_response.text.lower().strip()
        os.unlink(tmp_path)
        
        # Check if phrase matches (fuzzy matching)
        is_match = activation_phrase in transcription or transcription in activation_phrase
        confidence = 1.0 if is_match else 0.0
        
        if is_match:
            # End the session
            await db.going_out_sessions.update_one(
                {"user_id": current_user["id"], "is_active": True},
                {"$set": {
                    "is_active": False,
                    "ended_at": datetime.now(timezone.utc).isoformat(),
                    "ended_reason": "voice_verified"
                }}
            )
        
        return VoicePhraseVerification(
            phrase_detected=transcription,
            is_match=is_match,
            confidence=confidence
        )
    except Exception as e:
        logger.error(f"Voice verification error: {str(e)}")
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@api_router.post("/going-out/checkin")
async def respond_to_checkin(response: CheckinResponse, current_user: dict = Depends(get_current_user)):
    """User responds to check-in notification"""
    session = await db.going_out_sessions.find_one(
        {"user_id": current_user["id"], "is_active": True},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    
    if response.is_safe:
        # Update last checkin and set next one
        next_checkin = (now + timedelta(minutes=session.get("checkin_interval", 30))).isoformat()
        await db.going_out_sessions.update_one(
            {"user_id": current_user["id"], "is_active": True},
            {"$set": {
                "last_checkin": now.isoformat(),
                "next_checkin_due": next_checkin
            }}
        )
        return {"message": "Check-in recorded", "next_checkin": next_checkin}
    else:
        # User indicated they're not safe - trigger SOS
        alert = SOSAlert(
            user_id=current_user["id"],
            latitude=response.latitude or 0,
            longitude=response.longitude or 0,
            trigger_source="checkin",
            message="User indicated not safe during check-in"
        )
        await db.sos_alerts.insert_one(alert.model_dump())
        logger.warning(f"SOS triggered via check-in for user {current_user['name']}")
        return {"message": "SOS triggered", "alert_id": alert.id}

@api_router.post("/going-out/missed-checkin")
async def handle_missed_checkin(current_user: dict = Depends(get_current_user)):
    """Handle when user misses a check-in - trigger SOS"""
    session = await db.going_out_sessions.find_one(
        {"user_id": current_user["id"], "is_active": True},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    
    # Create SOS alert
    alert = SOSAlert(
        user_id=current_user["id"],
        latitude=0,
        longitude=0,
        trigger_source="checkin",
        message="Missed check-in - automatic SOS triggered"
    )
    await db.sos_alerts.insert_one(alert.model_dump())
    
    logger.warning(f"MISSED CHECKIN SOS: User {current_user['name']} missed check-in during Going Out Mode")
    
    return {"message": "SOS triggered due to missed check-in", "alert_id": alert.id}

# ==================== VOICE ACTIVATION ====================

@api_router.post("/voice/detect-phrase")
async def detect_activation_phrase(
    audio: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Detect if activation phrase is spoken - triggers SOS if matched"""
    
    settings = await db.user_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings or not settings.get("voice_activation_enabled"):
        raise HTTPException(status_code=400, detail="Voice activation not enabled")
    
    activation_phrase = settings.get("activation_phrase", "Help me").lower()
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        suffix = Path(audio.filename).suffix if audio.filename else ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        stt = OpenAISpeechToText(api_key=api_key)
        with open(tmp_path, "rb") as audio_file:
            transcription_response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json"
            )
        
        transcription = transcription_response.text.lower().strip()
        os.unlink(tmp_path)
        
        # Check for phrase match
        is_match = activation_phrase in transcription
        
        result = {
            "phrase_detected": transcription,
            "is_match": is_match,
            "confidence": 1.0 if is_match else 0.0,
            "sos_triggered": False
        }
        
        if is_match:
            # Trigger SOS
            alert = SOSAlert(
                user_id=current_user["id"],
                latitude=0,
                longitude=0,
                trigger_source="voice",
                message=f"Voice activation phrase detected: {transcription}"
            )
            await db.sos_alerts.insert_one(alert.model_dump())
            result["sos_triggered"] = True
            result["alert_id"] = alert.id
            logger.warning(f"VOICE ACTIVATED SOS: User {current_user['name']} spoke activation phrase")
        
        return result
    except Exception as e:
        logger.error(f"Voice detection error: {str(e)}")
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

# ==================== BATTERY & SHUTDOWN ====================

@api_router.post("/battery/update")
async def update_battery_status(status: BatteryStatus, current_user: dict = Depends(get_current_user)):
    """Update battery status and handle low battery scenarios"""
    
    settings = await db.user_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    result = {
        "level": status.level,
        "warning": None,
        "action_taken": None
    }
    
    if settings:
        low_threshold = settings.get("low_battery_threshold", 20)
        critical_threshold = settings.get("critical_battery_threshold", 5)
        
        if status.level <= critical_threshold and settings.get("send_location_on_low_battery"):
            # Critical battery - send final location
            if status.latitude and status.longitude:
                location = LocationHistory(
                    user_id=current_user["id"],
                    latitude=status.latitude,
                    longitude=status.longitude,
                    battery_level=status.level,
                    is_emergency=True
                )
                await db.location_history.insert_one(location.model_dump())
                result["action_taken"] = "final_location_sent"
                logger.warning(f"CRITICAL BATTERY: Final location sent for user {current_user['name']}")
            result["warning"] = "critical"
        elif status.level <= low_threshold and settings.get("low_battery_warning"):
            result["warning"] = "low"
    
    return result

@api_router.post("/shutdown/alert")
async def handle_shutdown_alert(current_user: dict = Depends(get_current_user)):
    """Handle shutdown attempt during Going Out Mode"""
    
    # Check if Going Out Mode is active
    session = await db.going_out_sessions.find_one(
        {"user_id": current_user["id"], "is_active": True},
        {"_id": 0}
    )
    
    settings = await db.user_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    result = {"shutdown_detected": True, "actions_taken": []}
    
    if session and settings and settings.get("shutdown_alert_enabled"):
        # Save last status
        await db.going_out_sessions.update_one(
            {"user_id": current_user["id"], "is_active": True},
            {"$set": {
                "is_active": False,
                "ended_at": datetime.now(timezone.utc).isoformat(),
                "ended_reason": "shutdown"
            }}
        )
        result["actions_taken"].append("session_ended")
        
        if settings.get("send_location_on_shutdown"):
            # Trigger SOS with shutdown source
            alert = SOSAlert(
                user_id=current_user["id"],
                latitude=0,
                longitude=0,
                trigger_source="shutdown",
                message="Phone shutdown detected during Going Out Mode"
            )
            await db.sos_alerts.insert_one(alert.model_dump())
            result["actions_taken"].append("sos_triggered")
            result["alert_id"] = alert.id
            logger.warning(f"SHUTDOWN ALERT: SOS triggered for user {current_user['name']} during Going Out Mode")
    
    return result

# ==================== EMERGENCY CONTACTS ====================

@api_router.get("/contacts", response_model=List[EmergencyContact])
async def get_contacts(current_user: dict = Depends(get_current_user)):
    contacts = await db.emergency_contacts.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).to_list(100)
    return contacts

@api_router.post("/contacts", response_model=EmergencyContact)
async def create_contact(contact_data: EmergencyContactCreate, current_user: dict = Depends(get_current_user)):
    contact = EmergencyContact(
        user_id=current_user["id"],
        **contact_data.model_dump()
    )
    await db.emergency_contacts.insert_one(contact.model_dump())
    return contact

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.emergency_contacts.delete_one({
        "id": contact_id,
        "user_id": current_user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

@api_router.put("/contacts/{contact_id}", response_model=EmergencyContact)
async def update_contact(contact_id: str, contact_data: EmergencyContactCreate, current_user: dict = Depends(get_current_user)):
    update_data = contact_data.model_dump()
    result = await db.emergency_contacts.update_one(
        {"id": contact_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact = await db.emergency_contacts.find_one({"id": contact_id}, {"_id": 0})
    return EmergencyContact(**contact)

# ==================== SOS ALERTS ====================

@api_router.post("/sos", response_model=SOSAlert)
async def create_sos_alert(alert_data: SOSAlertCreate, current_user: dict = Depends(get_current_user)):
    alert = SOSAlert(
        user_id=current_user["id"],
        latitude=alert_data.latitude,
        longitude=alert_data.longitude,
        message=alert_data.message,
        trigger_source=alert_data.trigger_source
    )
    await db.sos_alerts.insert_one(alert.model_dump())
    
    logger.warning(f"SOS ALERT: User {current_user['name']} triggered emergency at ({alert.latitude}, {alert.longitude}) - Source: {alert.trigger_source}")
    
    return alert

@api_router.get("/sos/history", response_model=List[SOSAlert])
async def get_sos_history(current_user: dict = Depends(get_current_user)):
    alerts = await db.sos_alerts.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return alerts

@api_router.put("/sos/{alert_id}/resolve")
async def resolve_sos(alert_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.sos_alerts.update_one(
        {"id": alert_id, "user_id": current_user["id"]},
        {"$set": {"status": "resolved"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert resolved"}

# ==================== LOCATION TRACKING ====================

@api_router.post("/location", response_model=LocationHistory)
async def save_location(location_data: LocationCreate, current_user: dict = Depends(get_current_user)):
    location = LocationHistory(
        user_id=current_user["id"],
        latitude=location_data.latitude,
        longitude=location_data.longitude,
        battery_level=location_data.battery_level,
        is_emergency=location_data.is_emergency
    )
    await db.location_history.insert_one(location.model_dump())
    return location

@api_router.get("/location/history", response_model=List[LocationHistory])
async def get_location_history(current_user: dict = Depends(get_current_user), limit: int = 50):
    locations = await db.location_history.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("timestamp", -1).to_list(limit)
    return locations

# ==================== FAKE CALL CONTACTS ====================

@api_router.get("/fake-call-contacts", response_model=List[FakeCallContact])
async def get_fake_call_contacts(current_user: dict = Depends(get_current_user)):
    contacts = await db.fake_call_contacts.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).to_list(10)
    return contacts

@api_router.post("/fake-call-contacts", response_model=FakeCallContact)
async def create_fake_call_contact(contact_data: FakeCallContactCreate, current_user: dict = Depends(get_current_user)):
    contact = FakeCallContact(
        user_id=current_user["id"],
        **contact_data.model_dump()
    )
    await db.fake_call_contacts.insert_one(contact.model_dump())
    return contact

@api_router.delete("/fake-call-contacts/{contact_id}")
async def delete_fake_call_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.fake_call_contacts.delete_one({
        "id": contact_id,
        "user_id": current_user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

# ==================== THREAT DETECTION (AI) ====================

@api_router.post("/analyze-audio", response_model=ThreatAnalysisResponse)
async def analyze_audio(
    audio: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Analyze audio for potential threats using Whisper + GPT-5.2"""
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        suffix = Path(audio.filename).suffix if audio.filename else ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        stt = OpenAISpeechToText(api_key=api_key)
        with open(tmp_path, "rb") as audio_file:
            transcription_response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="verbose_json"
            )
        
        transcription = transcription_response.text
        detected_language = getattr(transcription_response, 'language', None)
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"threat-analysis-{uuid.uuid4()}",
            system_message="""You are a safety analysis AI specialized in detecting potential threats to women's safety.
            
Analyze the transcribed conversation/audio and determine:
1. Is this a potential threat? (true/false)
2. Threat level: "none", "low", "medium", "high", "critical"
3. Type of threat: "harassment", "assault", "stalking", "robbery", "unknown", or "none"
4. Recommended action

Respond ONLY in this exact JSON format:
{
  "is_threat": true/false,
  "threat_level": "none|low|medium|high|critical",
  "threat_type": "harassment|assault|stalking|robbery|unknown|none",
  "confidence": 0.0-1.0,
  "recommended_action": "brief action recommendation"
}

Consider cultural context, tone, and explicit threats. Be cautious but avoid false positives for normal conversations."""
        ).with_model("openai", "gpt-5.2")
        
        analysis_prompt = f"""Analyze this transcribed audio for potential safety threats:

Transcription: "{transcription}"
Detected Language: {detected_language or 'Unknown'}

Provide your threat analysis in JSON format."""
        
        analysis_response = await chat.send_message(UserMessage(text=analysis_prompt))
        
        try:
            response_text = analysis_response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            analysis = json.loads(response_text.strip())
        except json.JSONDecodeError:
            analysis = {
                "is_threat": False,
                "threat_level": "none",
                "threat_type": "none",
                "confidence": 0.5,
                "recommended_action": "Unable to analyze - stay alert"
            }
        
        os.unlink(tmp_path)
        
        return ThreatAnalysisResponse(
            is_threat=analysis.get("is_threat", False),
            threat_level=analysis.get("threat_level", "none"),
            threat_type=analysis.get("threat_type"),
            transcription=transcription,
            detected_language=detected_language,
            confidence=analysis.get("confidence", 0.5),
            recommended_action=analysis.get("recommended_action", "Stay alert and aware of surroundings")
        )
        
    except Exception as e:
        logger.error(f"Audio analysis error: {str(e)}")
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "SafeGuard API is running", "status": "healthy", "version": "2.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
