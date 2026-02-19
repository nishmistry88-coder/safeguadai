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
- [x] Web frontend (React) - Fully functional with new branding
- [x] Mobile app UI redesign to match hero screen design
- [x] Auth screens (landing, login, register) - Updated with city skyline background
- [x] Dashboard screen - Updated with purple gradient, new cards
- [x] SOS screen - Updated with glowing button, gradient background
- [x] Going Out Mode screen - Updated with presets, safety options
- [x] Fake Call screen - Complete with realistic call UI
- [x] Settings screen - Country selection, voice activation
- [x] Contacts management screen - Complete CRUD
- [x] Journey tracking public page
- [x] Native services (location, shake, notifications)

### Design System Applied
- **Background**: London skyline (Tower Bridge) at night with purple lighting
- **Primary CTA**: Coral/red (#f43f5e) with glow shadows
- **Accent**: Violet/purple (#8b5cf6)
- **Typography**: Bold italic for headlines, weight 900
- **Cards**: Glassmorphic with `bg-zinc-900/70` and `border-zinc-700/50`
- **Gradient Overlay**: `from-violet-950/70 via-zinc-950/92 to-zinc-950/98`

### All Screens Updated with London Skyline ✅
- Landing, Login, Register (auth flow)
- Dashboard
- SOS
- Going Out Mode
- Fake Call
- Settings
- Contacts

### In Progress 🔄
- [ ] Mobile app end-to-end testing on device/emulator

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
