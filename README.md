# UYIR — Tamil Nadu Verified Blood & Platelet Emergency Network

> No patient in Tamil Nadu should lose time searching for blood or platelets.

UYIR is a **real-time, verified, AI-assisted blood & platelet emergency response network** for Tamil Nadu. Unlike donor directories, UYIR verifies every request, then uses AI to rank and alert only the most eligible donors in expanding geographic rings.

## Noble Cause Philosophy

UYIR is built as **Seva (service)**, not a data business:
- **Minimal data collection**: Only what's needed to save lives (name, phone, blood group, district, last donation date)
- **No health tracking**: No Hb, sleep, weight, drinking, smoking stored in profiles
- **Privacy-first**: Eligibility checked at moment of acceptance, not profiled
- **No monitoring**: Location used only during active alerts, not tracked continuously
- **Transparent**: Tamil translations, clear disclaimers, opt-in everything

## Monorepo Layout

```
UYIR/
├── client/                 # React + Vite + TypeScript + Tailwind + Capacitor
│   ├── src/
│   │   ├── components/     # Reusable UI components (shadcn-style)
│   │   ├── contexts/       # AppContext for global state
│   │   ├── lib/            # API client, constants, native wrappers
│   │   └── pages/          # Route components (Home, Profile, NewRequest, etc.)
│   ├── android/            # Capacitor Android native project
│   ├── ios/                # Capacitor iOS native project
│   └── capacitor.config.ts # Capacitor configuration
└── server/                 # Node + Express + TypeScript + Prisma
    ├── prisma/
    │   └── schema.prisma    # Database schema (PostgreSQL)
    ├── src/
    │   ├── lib/            # AI clients (OpenAI, Gemini, Replicate, Firebase)
    │   ├── middleware/      # Auth middleware
    │   ├── routes/         # API endpoints
    │   └── services/       # Business logic (alerts, verification, STT)
    └── .env.example        # Environment variables template
```

## Tech Stack

### Client Layer
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn-style custom components
- **Routing**: React Router v6
- **State Management**: React Context API
- **PWA**: Vite PWA plugin
- **Native Mobile**: Capacitor (Android/iOS)
- **Speech Recognition**: 
  - Web: OpenAI Whisper (via backend)
  - Native: Capacitor Speech Recognition plugin
- **Push Notifications**: Firebase Cloud Messaging (FCM)

### Server Layer
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon cloud-hosted)
- **ORM**: Prisma
- **Authentication**: JWT with bcrypt password hashing
- **SMS**: MSG91 (India-specific, cost-effective OTP)
- **Push Notifications**: Firebase Admin SDK

### AI Layer
| Layer | Provider | Model | Purpose |
|-------|----------|-------|---------|
| Speech-to-Text | OpenAI | Whisper-1 | Tamil/English voice input for requests |
| Document Verification | Google | Gemini 1.5 Pro | Validate hospital slips/prescriptions |
| Fraud Detection | OpenAI/Gemini | GPT-4o-mini / Gemini 1.5 Pro | Flag payment solicitation & spam |
| Request Verification | Google | Gemini 1.5 Pro | Completeness + authenticity scoring |
| Health Analysis | Google | Gemini 1.5 Pro | Donor health tips (static, no tracking) |
| Vision Fallback | Replicate | LLaVA-13B | Document verification if Gemini unavailable |

## Implementation Strategy

### 1. Authentication Flow
**Password-based login for existing users, OTP for new users**

```
New User:
  Mobile + Name → OTP → Set Password → Account Created

Existing User (has password):
  Mobile + Password → Login

Existing User (no password - legacy):
  Mobile → OTP → Set Password → Login
```

**Implementation Details**:
- Password field added to User model (nullable for backward compatibility)
- bcrypt for password hashing (10 rounds)
- `/auth/otp/request` returns `hasPassword` flag
- `/auth/login` requires mobile + password
- `/auth/otp/verify` accepts optional password for setup

### 2. Speech-to-Text (STT) Integration
**Hybrid approach: Web Whisper + Native Capacitor**

```
Web/Desktop:
  VoiceButton → Audio blob → Backend Whisper API → Transcript

Native Mobile:
  VoiceButton → Capacitor Speech Recognition → Transcript
```

**Implementation Details**:
- `client/src/lib/nativeStt.ts`: Native STT wrapper
- `client/src/components/VoiceButton.tsx`: Unified voice input component
- Backend `transcribeAudio()` uses OpenAI Whisper with Tamil language support
- Fallback to web-based Whisper if native unavailable

### 3. Document Verification (Google Vision)
**AI-powered hospital slip validation**

```
Request Upload → Base64 → Gemini Vision → Score + Notes
```

**Implementation Details**:
- `server/src/services/verification.ts`: `verifyDocument()` function
- Gemini 1.5 Pro for vision analysis
- Replicate LLaVA-13B as fallback
- Checks: hospital letterhead, stamps, signatures, clarity, patient name match
- Returns score (0-100), verified flag, and detailed notes

### 4. Alert Cycle with FCM Push
**Time-sensitive native push notifications**

```
Request Verified → Alert Cycle → Select Donors → FCM Push
```

**Implementation Details**:
- `server/src/services/alerts.ts`: Alert cycle logic
- Firebase Admin SDK for FCM push
- Payload includes: blood group, hospital, distance, urgency
- Filters donors by: blood group, availability, fcmToken, district
- Expanding radius: 5km → 10km → 20km → district → neighboring districts

### 5. Profile (Noble Cause Version)
**Minimal data collection, no health tracking**

```
Profile Fields:
  - Name (editable)
  - Phone (read-only, verified)
  - Blood Group (required, no "Unknown")
  - District (required, TN districts only)
  - Last Donation Date (optional)
  - Confirmation: "I am 18-65, above 45kg, feeling well today"
```

**Implementation Details**:
- Removed: Hb, sleep, weight, height, drinking, smoking fields
- Removed: "100% Eligible" badge and health tips section
- Removed: Identity documents upload
- Added: Privacy disclaimer about hospital verification
- Added: Tamil translations for all labels
- Notification toggles with warning when disabling

### 6. Database Schema
**PostgreSQL with Prisma ORM**

**Key Models**:
- `User`: id, name, mobile, password, bloodGroup, district, role, fcmToken, notificationsEnabled, voiceEnabled, locationEnabled
- `BloodRequest`: id, patientName, bloodGroup, componentType, unitsRequired, hospitalName, district, emergencyLevel, verificationScore
- `Response`: id, requestId, donorId, status, donationTracking
- `OtpCode`: mobile, code, expiresAt

**Implementation Details**:
- Neon PostgreSQL for cloud hosting
- Prisma for type-safe database access
- `prisma db push` for schema changes (non-interactive environment)
- Password field nullable for backward compatibility

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (or use Neon cloud)
- OpenAI API key
- Google Gemini API key
- MSG91 auth key (for SMS OTP)
- Firebase service account key (for FCM)

### Installation

```bash
# Clone repository
git clone https://github.com/VaishaliGajapathi/uyir.git
cd uyir

# Install dependencies
npm run install:all        # Install root + server + client deps

# Setup environment
cp server/.env.example server/.env
# Edit server/.env with your API keys

# Setup database
cd server
npx prisma generate       # Generate Prisma client
npx prisma db push        # Push schema to database (PostgreSQL)
cd ..

# Start development servers
npm run dev                # Server :4000, Client :5173
```

Open http://localhost:5173

### Environment Variables (server/.env)

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"

# Server
PORT=4000
NODE_ENV=development
JWT_SECRET=your-strong-random-secret

# AI Providers
OPENAI_API_KEY=sk-your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
REPLICATE_API_TOKEN=r8-your-replicate-token

# Models (optional overrides)
OPENAI_STT_MODEL=whisper-1
OPENAI_TEXT_MODEL=gpt-4o-mini
GEMINI_MODEL=gemini-1.5-pro

# SMS (MSG91 - India)
MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_OTP_TEMPLATE_ID=your-template-id

# Firebase (FCM Push)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

## Native Mobile Build

### Android
```bash
cd client
npm run build
npx cap sync android
npx cap open android    # Opens Android Studio
```

### iOS
```bash
cd client
npm run build
npx cap sync ios
npx cap open ios        # Opens Xcode
```

## Deployment

### Client (Netlify)
```bash
cd client
npm run build
# Deploy via Netlify dashboard or CLI
netlify deploy --prod
```

### Server (Render)
```bash
cd server
npm run build
# Deploy via Render dashboard with PostgreSQL add-on
# Set environment variables in Render dashboard
```

### Database Migrations
- Production uses PostgreSQL (Neon)
- Use `npx prisma db push` for schema changes
- No migration history (switched from SQLite to PostgreSQL)

## API Endpoints

### Authentication
- `POST /api/auth/otp/request` - Request OTP for signup
- `POST /api/auth/otp/verify` - Verify OTP and create account
- `POST /api/auth/login` - Password-based login
- `POST /api/auth/hospital/login` - Hospital approver login

### AI Services
- `GET /api/ai/status` - Check which AI providers are configured
- `POST /api/ai/transcribe` - Speech-to-text (Whisper)
- `POST /api/ai/parse-request` - Parse text into blood request
- `POST /api/ai/fraud-check` - Detect fraud in messages
- `POST /api/ai/health-tips` - Generate health tips (static)

### Blood Requests
- `GET /api/requests` - List blood requests
- `POST /api/requests` - Create new blood request
- `GET /api/requests/:id` - Get request details
- `POST /api/requests/:id/verify` - Verify request
- `POST /api/requests/:id/alert` - Trigger donor alerts
- `POST /api/requests/:id/escalate` - Escalate alert radius
- `POST /api/requests/:id/close` - Close request

### Donor Responses
- `GET /api/responses/mine` - Get my responses
- `POST /api/responses/for-request/:id/accept` - Accept request as donor
- `POST /api/responses/:id/complete` - Mark donation complete
- `POST /api/responses/:id/rate` - Rate donor

### User Profile
- `GET /api/users/me` - Get my profile
- `PATCH /api/users/me` - Update my profile
- `POST /api/users/me/location` - Update my location
- `POST /api/users/me/fcm-token` - Register FCM token

## Security Considerations

- **Password Hashing**: bcrypt with 10 rounds
- **JWT Authentication**: Secure token-based auth
- **OTP Expiry**: 5 minutes validity
- **Rate Limiting**: Implement for production
- **HTTPS Required**: For all API calls in production
- **Environment Variables**: Never commit .env files
- **Data Minimization**: Only collect essential data
- **Privacy**: No health data stored in profiles

## License

MIT License - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Support

For support, email support@uyir.in or WhatsApp: +91 9876543210
