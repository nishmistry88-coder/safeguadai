# SafeGuard - Women's Safety App PRD

## Original Problem Statement
Build an app that protects women when going out, protecting from potential threats. The AI should be able to hear and understand multiple languages to detect threats.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Framer Motion
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **AI**: OpenAI Whisper (speech-to-text) + GPT-5.2 (threat analysis)
- **Auth**: JWT-based authentication

## User Personas
1. **Primary**: Women who travel alone, commute at night, or work late
2. **Secondary**: Parents who want to ensure their daughters' safety
3. **Tertiary**: Anyone who feels unsafe in certain situations

## Core Requirements (Static)
- Emergency SOS button with location sharing
- AI-powered threat detection via audio monitoring
- Multi-language support for threat detection
- Fake call feature to escape uncomfortable situations
- Emergency contacts management
- Location tracking/history
- Dark mode UI for discretion

## What's Been Implemented

### Version 2.0 (Feb 2026) - Major Feature Update

#### Voice Activation Mode
- [x] Custom activation phrase (default: "Help me")
- [x] Phrase detection triggers SOS workflow
- [x] Manual enable/disable by user
- [x] Voice verification required to disable Going Out Mode

#### Going Out Mode
- [x] 5 Presets: Club, Festival, Date, Walking Home, Travel
- [x] Check-in timer (10-60 minute intervals)
- [x] Shake detection toggle
- [x] Auto-record on trigger toggle
- [x] Trigger fake call on missed check-in
- [x] No recording until trigger occurs

#### Automatic Triggers (Missed Check-in)
- [x] "Are you safe?" notification
- [x] Countdown timer (60 seconds)
- [x] Auto-trigger SOS if no response
- [x] Send location to emergency contacts
- [x] Start recording (if enabled)
- [x] Trigger fake call (optional)

#### Battery Tracking
- [x] Display battery percentage in dashboard
- [x] Low battery warning (configurable threshold, default 20%)
- [x] Critical battery alert (configurable, default 5%)
- [x] Send final location on critical battery

#### Shutdown Detection
- [x] Detect shutdown during Going Out Mode
- [x] Send final location update
- [x] Save last known status
- [x] Trigger safety actions

#### Comprehensive Settings
- [x] Voice Activation settings (phrase editing, voice verify toggle)
- [x] Check-in Timer settings (interval selection)
- [x] Trigger settings (shake, auto-record, fake call)
- [x] Battery settings (thresholds with sliders)
- [x] Shutdown settings (alert toggle, location send)

### Version 1.0 (Jan 2026) - Initial Release
- [x] User authentication (JWT)
- [x] Emergency contacts CRUD
- [x] SOS alerts with location
- [x] Fake call feature
- [x] AI threat detection (Whisper + GPT-5.2)
- [x] Location tracking
- [x] Dark mode UI

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### User Settings
- GET /api/settings
- PUT /api/settings

### Going Out Mode
- POST /api/going-out/start
- GET /api/going-out/active
- POST /api/going-out/end
- POST /api/going-out/verify-voice
- POST /api/going-out/checkin
- POST /api/going-out/missed-checkin

### Voice Activation
- POST /api/voice/detect-phrase

### Battery & Shutdown
- POST /api/battery/update
- POST /api/shutdown/alert

### Existing
- CRUD /api/contacts
- POST /api/sos, GET /api/sos/history
- POST /api/location, GET /api/location/history
- CRUD /api/fake-call-contacts
- POST /api/analyze-audio

## Prioritized Backlog

### P0 (Critical)
- [ ] SMS/Push notifications to emergency contacts on SOS
- [ ] Background service for continuous check-ins
- [ ] Offline mode support

### P1 (High)
- [ ] Journey sharing (share live location link)
- [ ] Integration with emergency services API
- [ ] Audio recording storage for evidence
- [ ] Widget for quick SOS access

### P2 (Medium)
- [ ] Safe zones with automatic alerts
- [ ] Community safety alerts
- [ ] Multiple language UI

### P3 (Nice to have)
- [ ] Wearable integration (smartwatch)
- [ ] Analytics dashboard

## Technical Notes
- Emergent LLM Key: Used for Whisper + GPT-5.2
- Audio format: webm supported for browser recording
- Battery API: Uses navigator.getBattery() where available
- Location: Uses browser Geolocation API
- Auth token stored in localStorage (7-day expiry)
- Voice verification uses Whisper for phrase matching
