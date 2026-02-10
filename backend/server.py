from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
from emergentintegrations.llm.openai import OpenAISpeechToText
from emergentintegrations.llm.chat import LlmChat, UserMessage
import tempfile
import aiofiles

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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "active"

class SOSAlertCreate(BaseModel):
    latitude: float
    longitude: float
    message: Optional[str] = None

class LocationHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    latitude: float
    longitude: float
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LocationCreate(BaseModel):
    latitude: float
    longitude: float

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
        message=alert_data.message
    )
    await db.sos_alerts.insert_one(alert.model_dump())
    
    # Log the SOS alert
    logger.warning(f"SOS ALERT: User {current_user['name']} triggered emergency at ({alert.latitude}, {alert.longitude})")
    
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
        longitude=location_data.longitude
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
    
    # Save uploaded file temporarily
    try:
        suffix = Path(audio.filename).suffix if audio.filename else ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Step 1: Transcribe audio using Whisper
        stt = OpenAISpeechToText(api_key=api_key)
        with open(tmp_path, "rb") as audio_file:
            transcription_response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="verbose_json"
            )
        
        transcription = transcription_response.text
        detected_language = getattr(transcription_response, 'language', None)
        
        # Step 2: Analyze transcription for threats using GPT-5.2
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
        
        # Parse the response
        import json
        try:
            # Extract JSON from response
            response_text = analysis_response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            analysis = json.loads(response_text.strip())
        except json.JSONDecodeError:
            # Default safe response if parsing fails
            analysis = {
                "is_threat": False,
                "threat_level": "none",
                "threat_type": "none",
                "confidence": 0.5,
                "recommended_action": "Unable to analyze - stay alert"
            }
        
        # Clean up temp file
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
        # Clean up temp file on error
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "SafeGuard API is running", "status": "healthy"}

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
