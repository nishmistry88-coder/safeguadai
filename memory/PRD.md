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

## What's Been Implemented (Jan 2026)

### Backend APIs
- [x] User authentication (register, login, JWT verification)
- [x] Emergency contacts CRUD
- [x] SOS alerts creation and management
- [x] Location tracking
- [x] Fake call contacts management
- [x] Audio analysis endpoint (Whisper + GPT-5.2 threat detection)

### Frontend Pages
- [x] Landing page with hero section and features
- [x] Login/Register with form validation
- [x] Dashboard with status card, quick actions, contacts preview
- [x] SOS page with hold-to-activate button (3-second hold)
- [x] Fake call with incoming/active call screens
- [x] Emergency contacts management
- [x] Settings with preferences

### Design Implementation
- [x] Dark mode first (Zinc 950 background)
- [x] Chivo + Inter fonts
- [x] Red (danger) + Violet (secondary) color scheme
- [x] Glass-morphism effects
- [x] Responsive mobile-first design
- [x] Bottom navigation for thumb-zone access

## Prioritized Backlog

### P0 (Critical)
- [ ] SMS/Push notifications to emergency contacts on SOS
- [ ] Continuous background audio monitoring mode
- [ ] Offline mode support

### P1 (High)
- [ ] Journey sharing (share live location with contacts)
- [ ] Timer-based check-ins
- [ ] Integration with emergency services API
- [ ] Audio recording storage for evidence

### P2 (Medium)
- [ ] Friend location sharing
- [ ] Safe zones (home, work) with automatic alerts
- [ ] Community safety alerts
- [ ] Widget for quick SOS access

### P3 (Nice to have)
- [ ] Voice-activated SOS ("Help me")
- [ ] Wearable integration (smartwatch)
- [ ] Multiple language UI
- [ ] Analytics dashboard for users

## Next Tasks
1. Add SMS notifications via Twilio for SOS alerts
2. Implement background audio monitoring service
3. Add timer-based safety check-ins
4. Journey sharing with live location updates

## Technical Notes
- Emergent LLM Key: Used for Whisper + GPT-5.2
- Audio format: webm supported for browser recording
- Location: Uses browser Geolocation API
- Auth token stored in localStorage (7-day expiry)
