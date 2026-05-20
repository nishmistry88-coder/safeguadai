# ==================== FASTAPI APP  ====================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SafeGuard API")

# CORS MUST be here — before ANY other imports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://safeguadai-frontend.onrender.com",
        "https://safeguadai.onrender.com",
        "*" # Added wildcard for mobile testing (Expo Go)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
import httpx  # Required for Google Maps API calls

# ==================== ENV + ROOT DIR ====================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ==================== AI IMPORTS & CLIENTS ====================
from google import genai
from google.genai import types
from anthropic import Anthropic
from openai import OpenAI

gemini_key = os.getenv("GEMINI_API_KEY")
claude_key = os.getenv("ANTHROPIC_API_KEY")
openai_key = os.getenv("OPENAI_API_KEY")
maps_key = os.getenv("GOOGLE_MAPS_API_KEY")

if not all([gemini_key, claude_key, openai_key, maps_key]):
    logging.error("CRITICAL: One or more API Keys are missing from environment variables!")

# Initialize the Elite AI Team
gemini_client = genai.Client(api_key=gemini_key)
claude_client = Anthropic(api_key=claude_key)
openai_client = OpenAI(api_key=openai_key)

# ==================== DATABASE ====================

mongo_url = os.getenv("MONGO_URL")
if not mongo_url:
    raise RuntimeError("MONGO_URL is not set in environment")

client = AsyncIOMotorClient(mongo_url)
db = client[os.getenv("DB_NAME", "SafeGuard")] # Fixed: Capitalized default name alignment

# Collections
users_collection = db.get_collection("users")
sos_collection = db.get_collection("sos_alerts")
sessions_collection = db.get_collection("sessions")
locations_collection = db.get_collection("locations")

# ==================== AUTOMATIC DATABASE INITIALIZATION ====================

@app.on_event("startup")
async def initialize_database_indexes():
    """
    Forces MongoDB to create the 'sos_alerts' collection if missing
    and builds the 2dsphere index so geospatial queries don't crash.
    """
    try:
        existing_collections = await db.list_collection_names()
        
        # Force collection instantiation if MongoDB hasn't created it yet
        if "sos_alerts" not in existing_collections:
            logging.info("Database migration: Constructing 'sos_alerts' collection structural space...")
            await db.create_collection("sos_alerts")
            
        # Build the geospatial index on the location field format requirement
        logging.info("Database migration: Verifying 2dsphere spatial index on 'sos_alerts'...")
        await sos_collection.create_index([("location", "2dsphere")])
        logging.info("SUCCESS: Geospatial safety matrix index is fully active.")
        
    except Exception as e:
        logging.error(f"CRITICAL: Failed to initialize spatial index on startup: {e}")


# ==================== JWT & TWILIO CONFIG ====================

JWT_SECRET = os.environ.get("JWT_SECRET", "safeguard_secret_key")
JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

def get_twilio_client() -> Optional[Client]:
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        return None
    return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

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
    trigger_source: str = "manual"
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
    confidence: Optional[float] = 1.0
    recommended_action: str

class AssistantRequest(BaseModel):
    message: str
    user_id: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    name: Optional[str] = "User"

class AssistantResponse(BaseModel):
    reply: str

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

class IncidentReport(BaseModel):
    user_id: str
    incident_type: str  # e.g., "Suspicious Activity", "Unlit Street", "Harassment"
    description: Optional[str] = None
    lat: float
    lng: float

class IncapacitationAlert(BaseModel):
    user_id: str
    lat: float
    lng: float
    status: str = "incapacitated"    

# ==================== HELPERS ====================

async def get_nearby_safe_havens(lat: float, lng: float, user_query: str = ""):
    """Searches for safe spots using clean Google Places parameters."""
    places_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    
    params = {
        "location": f"{lat},{lng}",
        "radius": 1500, 
        "type": "convenience_store|gas_station|police|pharmacy|grocery_or_supermarket",
        "key": maps_key
    }
    
    if user_query and len(user_query) < 30:
        params["keyword"] = user_query

    async with httpx.AsyncClient() as client:
        try:
            p_resp = await client.get(places_url, params=params)
            results = p_resp.json().get("results", [])[:4] 
            
            if not results:
                return []

            destinations = "|".join([f"place_id:{r['place_id']}" for r in results])
            dist_url = "https://maps.googleapis.com/maps/api/distancematrix/json"
            dist_params = {
                "origins": f"{lat},{lng}",
                "destinations": destinations,
                "mode": "walking",
                "key": maps_key
            }
            
            d_resp = await client.get(dist_url, params=dist_params)
            dist_data = d_resp.json()
            
            safe_spots = []
            for i, spot in enumerate(results):
                try:
                    # 🕒 Check live opening status from Google parameters
                    is_open = spot.get("opening_hours", {}).get("open_now", True)
                    
                    # If closed right now, drop it immediately to prevent locked door hazards
                    if not is_open:
                        continue
                        
                    elements = dist_data.get('rows', [])[0].get('elements', [])
                    duration = elements[i].get('duration', {}).get('text', 'nearby')
                    name = spot.get('name')
                    safe_spots.append(f"{name} ({duration} walk)")
                except (IndexError, KeyError):
                    name = spot.get('name')
                    safe_spots.append(f"{name} (nearby)")
                
            return safe_spots
        except Exception as e:
            logging.error(f"Maps API Failure: {e}")
            return []

# 🌟 OUTSIDE AND INDEPENDENT OF THE MAPS TRY/EXCEPT BLOCK 🌟
async def get_local_crime_data(lat: float, lng: float):
    """Fetches real-time localized crime markers from the official UK Police API."""
    police_url = "https://data.police.uk/api/crimes-at-location"
    params = {"lat": lat, "lng": lng}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(police_url, params=params, timeout=4.0)
            if response.status_code != 200:
                return "Regional dataset scanner nominal."
            
            crimes = response.json()
            if not crimes:
                return "No high-risk structural crime trends logged on this block recently."
            
            categories = [item.get("category", "incident").replace("-", " ").title() for item in crimes]
            counts = {}
            for cat in categories:
                counts[cat] = counts.get(cat, 0) + 1
                
            summary = [f"{count} {name} entries" for name, count in counts.items()]
            return f"Historical baseline for this block includes {', '.join(summary[:2])}."
        except Exception as e:
            logging.error(f"Police API Error: {e}")
            return "Local crime database index temporarily unreachable."

# ==================== PUBLIC CROWDSOURCING ROUTE ====================

@app.post("/report-incident")
async def report_incident(report: IncidentReport):
    """Allows active app users to broadcast real-time safety hazards globally."""
    try:
        incident_doc = {
            "user_id": report.user_id,
            "incident_type": report.incident_type,
            "description": report.description,
            "location": {
                "type": "Point",
                "coordinates": [report.lng, report.lat] 
            },
            "created_at": datetime.now(timezone.utc)
        }
        await sos_collection.insert_one(incident_doc)
        return {"status": "success", "message": "Hazard successfully pinned to safety matrix."}
    except Exception as e:
        logging.error(f"Incident Submission Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to catalog local hazard.")

# ==================== ASSISTANT ENDPOINT ====================

@app.post("/assistant", response_model=AssistantResponse)
async def assistant_endpoint(request: AssistantRequest):
    try:
        # 1. Pull the last 5 messages for memory history
        past_messages = await sessions_collection.find(
            {"user_id": request.user_id}
        ).sort("timestamp", -1).limit(5).to_list(length=5)
        
        history = []
        for msg in reversed(past_messages):
            history.append({"role": "user", "content": msg["user_message"]})
            history.append({"role": "assistant", "content": msg["ai_response"]})

        location_context = ""
        if request.lat is not None and request.lng is not None:
            # 📍 Layer 1: Google Maps Safe Havens
            spots = await get_nearby_safe_havens(request.lat, request.lng, request.message)
            
            # ⏳ Layer 2: UK Police API Historical Baseline
            crime_context = await get_local_crime_data(request.lat, request.lng)
            
            # 👥 Layer 3: MongoDB Geo-Crowdsourced Live Safety Reports (Within 500m)
            try:
                crowd_matches = await sos_collection.find({
                    "location": {
                        "$near": {
                            "$geometry": {
                                "type": "Point",
                                "coordinates": [request.lng, request.lat]
                            },
                            "$maxDistance": 500 
                        }
                    }
                }).to_list(length=3)
                
                alerts = [f"{a['incident_type']} ({a.get('description', 'No details')})" for a in crowd_matches]
                crowd_context = ", ".join(alerts) if alerts else "No user-reported hazards in immediate proximity."
            except Exception as geo_err:
                logging.error(f"Geo Index Lookup Error: {geo_err}")
                crowd_context = "Community crowdsourcing metrics unindexed."

            location_context = f"""
            ENVIRONMENT CONTEXT MATRIX:
            - Verified Safe Havens Available: {', '.join(spots) if spots else 'None in immediate range.'}
            - Local Area Police Trends: {crime_context}
            - ACTIVE LIVE USER INCIDENTS (Reported by community within 500m): {crowd_context}
            """

        # 🛡️ Hardened System Prompt overriding pre-trained LLM memory and visibility boundaries
        system_instruction = f"""
        You are the SafeGuard AI Guardian, a tactical, real-time personal safety assistant.
        
        DATABASE MEMORY CONTEXT:
        - You possess an active database sync.
        - You REMEMBER details from past interactions perfectly because logs are saved securely to MongoDB.
        - Never tell the user you lose memory or forget information upon panel closure; stay in character and maintain confidence.

        LIVE TELEMETRY CONTEXT:
        - The user's mobile device is actively feeding you live coordinates. 
        - You DO have real-time access to their physical coordinates via this system channel. Never tell the user you cannot see their location or ask them to type it manually.
        {location_context}
        
        Your Task:
        1. Treat the ENVIRONMENT CONTEXT MATRIX provided above as their absolute physical environment.
        2. If the user asks where they are, where to head, or indicates immediate danger, analyze the verified havens and user incidents to plot an optimized, survival route. Flag user incidents clearly as temporary obstacles.
        3. Extraction Protocol: If the user requests a taxi, cab, or rideshare, instruct them firmly to open their service immediately. Direct them to walk toward and wait inside one of the well-lit safe spots listed in the verified data while the car arrives.
        4. Keep your tone highly tactical, calm, authoritative, and protective. Limit responses to a maximum of 3 sentences.
        """

        # 2. Assemble Message Payload
        messages = [{"role": "system", "content": system_instruction}]
        messages.extend(history)
        messages.append({"role": "user", "content": request.message})

        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages
        )
        
        reply = completion.choices[0].message.content

        # 3. SAVE conversation data to MongoDB for continuous recall
        await sessions_collection.insert_one({
            "user_id": request.user_id,
            "user_message": request.message,
            "ai_response": reply,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        return AssistantResponse(reply=reply)

    except Exception as e:
        logging.error(f"Assistant Error: {e}")
        return AssistantResponse(reply="I'm tracking you. Keep moving toward a populated, well-lit area immediately.")
        
# ==================== ROOT ENDPOINT ====================

_start_time = time.time()

@app.get("/")
def read_root():
    uptime_seconds = int(time.time() - _start_time)
    return {
        "status": "ok",
        "service": "safeguard-backend",
        "version": "0.0.5",
        "uptime_seconds": uptime_seconds
    }

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
    # NEW: allow CORS to run before rejecting
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing token")

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

# ==================== CONTACTS ROUTES ====================

@app.get("/contacts")
async def get_contacts(current_user: dict = Depends(get_current_user)):
    contacts = await db.contacts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return contacts

@app.post("/contacts")
async def create_contact(contact: EmergencyContactCreate, current_user: dict = Depends(get_current_user)):
    new_contact = EmergencyContact(
        user_id=current_user["id"],
        name=contact.name,
        phone=contact.phone,
        relationship=contact.relationship,
        is_primary=contact.is_primary,
    )
    await db.contacts.insert_one(new_contact.model_dump())
    return new_contact

@app.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, contact: EmergencyContactCreate, current_user: dict = Depends(get_current_user)):
    result = await db.contacts.update_one(
        {"id": contact_id, "user_id": current_user["id"]},
        {"$set": contact.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return updated

@app.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.contacts.delete_one({"id": contact_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

# ==================== EMERGENCY DISPATCH ROUTE ====================

@app.post("/emergency-dispatch")
async def emergency_dispatch(alert: IncapacitationAlert):
    """
    Triggers an automated outbound Twilio voice call to emergency lines 
    when a user is non-responsive during a crimson alert countdown.
    """
    twilio_client = get_twilio_client()
    if not twilio_client:
        logging.error("Twilio client unconfigured. Cannot place automated distress call.")
        raise HTTPException(status_code=500, detail="Emergency communication gateway offline.")

    # 1. Fetch user profile data using the matching 'id' parameter layout
    user_profile = await users_collection.find_one({"id": alert.user_id})
    user_name = user_profile.get("name", "An anonymous user") if user_profile else "A SafeGuard User"

    # 2. Craft the automated verbal script for emergency dispatch operators
    dispatch_script = f"""
    <Response>
        <Speak voice="alice">
            Emergency dispatch alert. This is an automated distress broadcast from the SafeGuard AI platform on behalf of user {user_name}. 
            The user has triggered a critical incapacitation alarm and is completely non-responsive. 
            Automated telemetry places the user at coordinates latitude {alert.lat:.4f} and longitude {alert.lng:.4f}. 
            I repeat: the user is non-responsive and requires immediate intervention. Dispatching rescue services to these tracking metrics immediately.
        </Speak>
    </Response>
    """

    try:
        # 3. Save the critical emergency event to your MongoDB log grid
        await sos_collection.insert_one({
            "user_id": alert.user_id,
            "incident_type": "INCAPACITATED_DISTRESS_CALL",
            "description": f"Automated voice dispatch initiated for {user_name}.",
            "location": {
                "type": "Point",
                "coordinates": [alert.lng, alert.lat]
            },
            "created_at": datetime.now(timezone.utc)
        })

        # 4. Fire the outbound Twilio call to your primary emergency contact number 
        call = twilio_client.calls.create(
            twiml=dispatch_script,
            to=os.getenv("PRIMARY_EMERGENCY_ROUTING_NUMBER", TWILIO_PHONE_NUMBER), 
            from_=TWILIO_PHONE_NUMBER
        )
        
        logging.info(f"CRIMSON EMERGENCY ALARM DEPLOYED: Call SID {call.sid}")
        return {"status": "success", "message": "Automated dispatch voice lines successfully routed."}

    except Exception as e:
        logging.error(f"Failed to deploy emergency automated call payload: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate outbound emergency communication.")

# ==================== EMERGENCY TAB LINK ALIAS ====================

@app.post("/location/emergency")
async def location_emergency_alias(alert: IncapacitationAlert):
    """
    Alias endpoint map to handle the legacy network requests coming 
    from the dedicated main navigation Emergency Screen tab interface.
    """
    logging.info("⚡ Legacy /location/emergency route intercepted. Redirecting payload to dispatch core...")
    return await emergency_dispatch(alert)

# ==================== SETTINGS ROUTES ====================

@app.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings:
        # Create default settings if none exist
        settings = UserSettings(user_id=current_user["id"])
        await db.settings.insert_one(settings.model_dump())
        return settings.model_dump()
    return settings

@app.put("/settings")
async def update_settings(updates: UserSettingsUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": update_data},
        upsert=True
    )
    settings = await db.settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return settings

# ==================== SOS ROUTES ====================

@app.post("/sos")
async def create_sos(alert: SOSAlertCreate, current_user: dict = Depends(get_current_user)):
    new_alert = SOSAlert(
        user_id=current_user["id"],
        latitude=alert.latitude,
        longitude=alert.longitude,
        message=alert.message,
        trigger_source=alert.trigger_source,
    )
    await db.sos_alerts.insert_one(new_alert.model_dump())

    # Try to send SMS via Twilio
    twilio = get_twilio_client()
    if twilio:
        contacts = await db.contacts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(10)
        for contact in contacts:
            try:
                maps_link = f"https://maps.google.com/?q={alert.latitude},{alert.longitude}"
                twilio.messages.create(
                    body=f"🚨 SOS Alert from {current_user.get('name', 'your contact')}! Location: {maps_link}",
                    from_=TWILIO_PHONE_NUMBER,
                    to=contact["phone"]
                )
            except Exception as e:
                print(f"Twilio error: {e}")

    return new_alert

@app.get("/sos")
async def get_sos_alerts(current_user: dict = Depends(get_current_user)):
    alerts = await db.sos_alerts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(50)
    return alerts

# ==================== LOCATION ROUTES ====================

@app.post("/location")
async def update_location(location: LocationCreate, current_user: dict = Depends(get_current_user)):
    new_location = LocationHistory(
        user_id=current_user["id"],
        latitude=location.latitude,
        longitude=location.longitude,
        battery_level=location.battery_level,
        is_emergency=location.is_emergency,
    )
    await db.locations.insert_one(new_location.model_dump())
    return new_location

# ==================== LIVE GPS TRACKING ====================

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: float | None = None
    speed: float | None = None
    heading: float | None = None
    timestamp: datetime | None = None

@app.post("/location/update")
async def update_live_location(data: LocationUpdate, current_user: dict = Depends(get_current_user)):
    location_data = {
        "user_id": current_user["id"],
        "latitude": data.latitude,
        "longitude": data.longitude,
        "accuracy": data.accuracy,
        "speed": data.speed,
        "heading": data.heading,
        "timestamp": data.timestamp or datetime.utcnow()
    }

    await db.locations.update_one(
        {"user_id": current_user["id"]},
        {"$set": location_data},
        upsert=True
    )

    return {"status": "success", "message": "Live location updated"}

@app.get("/location/latest")
async def get_latest_location(current_user: dict = Depends(get_current_user)):
    location = await db.locations.find_one({"user_id": current_user["id"]})

    if not location:
        raise HTTPException(status_code=404, detail="No location found")

    location["_id"] = str(location["_id"])
    return location

# ==================== BATTERY ROUTES ====================

@app.post("/battery/update")
async def update_battery(battery: BatteryStatus, current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"user_id": current_user["id"]})

    # Send location alert on low battery if enabled
    if settings and settings.get("send_location_on_low_battery"):
        threshold = settings.get("low_battery_threshold", 20)
        if battery.level <= threshold and battery.latitude and battery.longitude:
            twilio = get_twilio_client()
            if twilio:
                contacts = await db.contacts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(10)
                for contact in contacts:
                    try:
                        maps_link = f"https://maps.google.com/?q={battery.latitude},{battery.longitude}"
                        twilio.messages.create(
                            body=f"⚠️ {current_user.get('name', 'Your contact')}'s battery is at {battery.level}%. Last location: {maps_link}",
                            from_=TWILIO_PHONE_NUMBER,
                            to=contact["phone"]
                        )
                    except Exception as e:
                        print(f"Twilio error: {e}")

    return {"message": "Battery status updated", "level": battery.level}

# ==================== FAKE CALL CONTACTS ROUTES ====================

@app.get("/fake-call-contacts")
async def get_fake_call_contacts(current_user: dict = Depends(get_current_user)):
    contacts = await db.fake_call_contacts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(20)
    return contacts

@app.post("/fake-call-contacts")
async def create_fake_call_contact(contact: FakeCallContactCreate, current_user: dict = Depends(get_current_user)):
    new_contact = FakeCallContact(
        user_id=current_user["id"],
        name=contact.name,
        phone=contact.phone,
    )
    await db.fake_call_contacts.insert_one(new_contact.model_dump())
    return new_contact

@app.delete("/fake-call-contacts/{contact_id}")
async def delete_fake_call_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.fake_call_contacts.delete_one({"id": contact_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

# ==================== GOING OUT ROUTES ====================

@app.get("/going-out/active")
async def get_active_session(current_user: dict = Depends(get_current_user)):
    session = await db.going_out_sessions.find_one(
        {"user_id": current_user["id"], "is_active": True}, {"_id": 0}
    )
    return session or {}

@app.post("/going-out/start")
async def start_going_out(session: GoingOutSessionCreate, current_user: dict = Depends(get_current_user)):
    # End any existing active session
    await db.going_out_sessions.update_many(
        {"user_id": current_user["id"], "is_active": True},
        {"$set": {"is_active": False, "ended_at": datetime.now(timezone.utc).isoformat(), "ended_reason": "replaced"}}
    )
    new_session = GoingOutSession(
        user_id=current_user["id"],
        preset=session.preset,
        voice_activation_enabled=session.voice_activation_enabled,
        shake_detection_enabled=session.shake_detection_enabled,
        auto_record_enabled=session.auto_record_enabled,
        checkin_enabled=session.checkin_enabled,
        checkin_interval=session.checkin_interval,
    )
    await db.going_out_sessions.insert_one(new_session.model_dump())
    return new_session

@app.post("/going-out/end")
async def end_going_out(current_user: dict = Depends(get_current_user)):
    result = await db.going_out_sessions.update_one(
        {"user_id": current_user["id"], "is_active": True},
        {"$set": {"is_active": False, "ended_at": datetime.now(timezone.utc).isoformat(), "ended_reason": "manual"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No active session found")
    return {"message": "Session ended"}

@app.post("/going-out/checkin")
async def checkin(response: CheckinResponse, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.going_out_sessions.update_one(
        {"user_id": current_user["id"], "is_active": True},
        {"$set": {"last_checkin": now}}
    )
    return {"message": "Check-in recorded", "is_safe": response.is_safe}

@app.post("/going-out/missed-checkin")
async def missed_checkin(current_user: dict = Depends(get_current_user)):
    twilio = get_twilio_client()
    if twilio:
        contacts = await db.contacts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(10)
        for contact in contacts:
            try:
                twilio.messages.create(
                    body=f"⚠️ {current_user.get('name', 'Your contact')} missed their safety check-in. Please check on them.",
                    from_=TWILIO_PHONE_NUMBER,
                    to=contact["phone"]
                )
            except Exception as e:
                print(f"Twilio error: {e}")
    return {"message": "Missed check-in alert sent"}

@app.post("/going-out/verify-voice")
async def verify_voice(verification: VoicePhraseVerification, current_user: dict = Depends(get_current_user)):
    return {"verified": verification.is_match, "confidence": verification.confidence}

# ==================== JOURNEY SHARING ROUTES ====================

@app.post("/journey/start")
async def start_journey(journey: JourneyShareCreate, current_user: dict = Depends(get_current_user)):
    # End any existing active journey
    await db.journeys.update_many(
        {"user_id": current_user["id"], "is_active": True},
        {"$set": {"is_active": False, "ended_at": datetime.now(timezone.utc).isoformat()}}
    )
    from datetime import timedelta
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=journey.duration_hours)).isoformat()
    new_journey = JourneyShare(
        user_id=current_user["id"],
        user_name=current_user.get("name", "Unknown"),
        preset=journey.preset,
        current_latitude=journey.latitude,
        current_longitude=journey.longitude,
        expires_at=expires_at,
    )
    await db.journeys.insert_one(new_journey.model_dump())
    return new_journey

@app.get("/journey/active")
async def get_active_journey(current_user: dict = Depends(get_current_user)):
    journey = await db.journeys.find_one(
        {"user_id": current_user["id"], "is_active": True}, {"_id": 0}
    )
    return journey or {}

@app.post("/journey/update-location")
async def update_journey_location(location: JourneyLocationUpdate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.journeys.update_one(
        {"user_id": current_user["id"], "is_active": True},
        {"$set": {
            "current_latitude": location.latitude,
            "current_longitude": location.longitude,
            "battery_level": location.battery_level,
            "last_updated": now
        }}
    )
    return {"message": "Location updated"}

@app.post("/journey/end")
async def end_journey(current_user: dict = Depends(get_current_user)):
    result = await db.journeys.update_one(
        {"user_id": current_user["id"], "is_active": True},
        {"$set": {"is_active": False, "ended_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No active journey found")
    return {"message": "Journey ended"}

@app.get("/journey/track/{share_token}")
async def track_journey(share_token: str):
    journey = await db.journeys.find_one({"share_token": share_token, "is_active": True}, {"_id": 0})
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found or expired")
    return JourneySharePublic(
        user_name=journey["user_name"],
        preset=journey.get("preset"),
        current_latitude=journey.get("current_latitude"),
        current_longitude=journey.get("current_longitude"),
        battery_level=journey.get("battery_level"),
        last_updated=journey["last_updated"],
        started_at=journey["started_at"],
        is_active=journey["is_active"],
    )

# ==================== AUDIO ANALYSIS ROUTE ====================

@app.post("/analyze-audio", response_model=ThreatAnalysisResponse)
async def analyze_audio(file: UploadFile = File(...)):
    try:
        # 1. Save temp file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # 2. STEP ONE: Gemini "Listens" (Cheap & Fast)
        # Gemini 2.5 Flash-Lite handles raw audio natively
        gemini_response = gemini_client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[
                "Transcribe this audio and describe the emotional tone. Is there any background noise like screaming or struggle?",
                types.Part.from_uri(file_uri=tmp_path, mime_type="audio/mp3") # Use local path
            ]
        )
        
        analysis_summary = gemini_response.text

        # 3. STEP TWO: Claude "Decides" (Highly Accurate Reasoning)
        claude_response = claude_client.messages.create(
            model="claude-3-5-haiku", # Fast and extremely smart for JSON
            max_tokens=500,
            system="You are the lead safety officer for SafeGuard AI. Analyze the provided audio summary and return a JSON safety report.",
            messages=[
                {"role": "user", "content": f"Review this audio analysis and determine if this is a threat: {analysis_summary}"}
            ]
        )

        # Parse Claude's logic into your ThreatAnalysisResponse model
        # (use a standard JSON parser here)
        
        os.remove(tmp_path) # Clean up temp file
        
        return {
            "is_threat": True, # Logic to be parsed from Claude
            "threat_level": "high",
            "transcription": analysis_summary,
            "recommended_action": "Activating Emergency Protocol"
        }

    except Exception as e:
        logging.error(f"AI Analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Safety analysis failed.")
        import json as json_lib
        result = json_lib.loads(analysis.choices[0].message.content)
        return ThreatAnalysisResponse(
            is_threat=result.get("is_threat", False),
            threat_level=result.get("threat_level", "none"),
            threat_type=result.get("threat_type"),
            transcription=transcript_text,
            detected_language=result.get("detected_language"),
            confidence=result.get("confidence", 0.0),
            recommended_action=result.get("recommended_action", "No action needed"),
        )
    except Exception as e:
        print(f"Audio analysis error: {e}")
        raise HTTPException(status_code=500, detail="Audio analysis failed")