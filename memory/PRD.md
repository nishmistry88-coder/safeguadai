# SafeGuard AI - Product Requirements Document

## Overview
SafeGuard AI is a women's safety application that provides AI-powered personal protection features. The app supports multiple platforms (Android, iOS, Web) through a React Native + Expo mobile app and a React web application, both backed by a FastAPI + MongoDB server.

## Brand Identity
- **Name:** SafeGuard AI
- **Slogan:** "Your Voice. Your Safety. Your Control."
- **Logo:** Shield-based icon with AI integration

## Architecture

### Tech Stack
- **Backend:** FastAPI (Python) + MongoDB
- **Web Frontend:** React + Tailwind CSS + Shadcn UI
- **Mobile Frontend:** React Native + Expo + NativeWind
- **AI Services:** OpenAI Whisper (STT) + GPT-5.2 (Threat Analysis) via Emergent LLM Key

### Repository Structure
```
/app/
├── backend/         # FastAPI server (Port 8001)
│   └── server.py    # Main API routes
├── frontend/        # React web app (Port 3000)
│   └── src/pages/   # Web screens
└── mobile/          # Expo (React Native) app
    ├── app/         # Expo Router screens
    │   ├── (auth)/  # Auth flow (landing, login, register)
    │   ├── (tabs)/  # Main screens (dashboard, sos, going-out, fake-call, settings, contacts)
    │   └── track/   # Public journey tracking
    └── services/    # API and native services
```

## Core Features

### 1. Authentication
- JWT-based authentication
- Secure token storage (expo-secure-store)
- User registration and login

### 2. SOS Emergency Alert
- Hold-to-activate SOS button (3 seconds)
- Location sharing with emergency contacts
- Universal emergency number display by country
- Haptic feedback and vibration

### 3. Going Out Mode
- Preset-based protection (Club, Festival, Date, Walking Home, Travel)
- Check-in timer with customizable intervals
- Shake detection for SOS trigger
- Voice activation mode
- Auto-record on trigger
- Journey sharing with tracking link

### 4. Fake Call
- Customizable caller contacts
- Realistic incoming call UI
- Active call timer display
- Vibration pattern

### 5. Emergency Contacts
- Add/edit/delete contacts
- Relationship categorization
- Primary contact designation
- SOS notification recipients

### 6. Journey Sharing
- Shareable tracking links
- Real-time location updates
- Battery level reporting
- Time-limited sharing (1-24 hours)

### 7. Settings
- Country selection (50+ countries)
- Emergency number configuration
- Voice activation phrase customization
- Battery and shutdown alerts
- Notification preferences

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user

### Contacts
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Add contact
- `PUT /api/contacts/{id}` - Update contact
- `DELETE /api/contacts/{id}` - Remove contact

### SOS
- `POST /api/sos` - Trigger alert
- `GET /api/sos/history` - Get alerts
- `PUT /api/sos/{id}/resolve` - Mark resolved

### Going Out Mode
- `POST /api/going-out/start` - Start session
- `GET /api/going-out/active` - Get session
- `POST /api/going-out/end` - End session
- `POST /api/going-out/checkin` - Check-in response

### Journey Sharing
- `POST /api/journey/start` - Start sharing
- `GET /api/journey/active` - Get journey
- `POST /api/journey/end` - Stop sharing
- `GET /api/journey/track/{token}` - Public tracking

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

### Fake Call
- `GET /api/fake-call-contacts` - List callers
- `POST /api/fake-call-contacts` - Add caller
- `DELETE /api/fake-call-contacts/{id}` - Remove caller

## Database Schema

- **users**: id, email, name, hashed_password, created_at
- **contacts**: id, user_id, name, phone, relationship, is_primary
- **settings**: user_id, country_code, voice_activation_enabled, activation_phrase, etc.
- **sessions**: id, user_id, preset, is_active, check_in_interval, settings...
- **journeys**: id, user_id, share_token, is_active, started_at, expires_at
- **locations**: id, user_id, journey_id, latitude, longitude, timestamp, battery_level
- **alerts**: id, user_id, trigger_source, location, created_at, resolved

---

## Implementation Status (Feb 19, 2026)

### Completed ✅
- [x] Backend API (all endpoints tested - 100% pass rate)
- [x] Web frontend (React) - Fully functional
- [x] Mobile app scaffolding (Expo + NativeWind)
- [x] Auth screens (landing, login, register)
- [x] Dashboard screen
- [x] SOS screen with hold-to-activate
- [x] Going Out Mode screen with presets
- [x] Fake Call screen with contacts
- [x] Settings screen with country selection
- [x] Contacts management screen
- [x] Journey tracking public page
- [x] Native services (location, shake, notifications)

### In Progress 🔄
- [ ] Mobile app end-to-end testing
- [ ] Native feature integration testing

### Future/Backlog 📋
- [ ] Offline mode for core safety features
- [ ] Build artifacts (APK, iOS TestFlight)
- [ ] Real map integration (Mapbox/Google Maps)
- [ ] Geofencing for "safe zone" alerts
- [ ] Country-specific women's helpline database
- [ ] Push notification server integration
- [ ] Audio threat detection integration

---

## Test Results
- **Backend:** 35/35 tests passed (100%)
- **Test Report:** `/app/test_reports/iteration_5.json`
