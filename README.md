# UYIR — Tamil Nadu Verified Blood & Platelet Emergency Network

> No patient in Tamil Nadu should lose time searching for blood or platelets.

UYIR is a **real-time, verified, AI-assisted blood & platelet emergency response network** for Tamil Nadu. Unlike donor directories, UYIR verifies every request, then uses AI to rank and alert only the most eligible donors in expanding geographic rings.

## Monorepo layout

```
UYIR/
├── client/   # React + Vite + TS + Tailwind + shadcn-style + PWA  (deploy: Netlify)
└── server/   # Node + Express + TS + Prisma (SQLite local / Postgres on Render)
```

## AI layers (real API calls)

| Layer | Provider | Purpose |
|-------|----------|---------|
| Voice → Text | OpenAI Whisper | Tamil/English voice input for requests & profiles |
| Document verification | Google Gemini (vision) | Validate hospital slips / prescriptions |
| Fraud detection | OpenAI / Gemini | Flag payment solicitation & spam |
| Request verification score | Gemini | Completeness + authenticity scoring |
| Donor matching | Scoring engine + AI tie-break | Rank eligible donors |
| Radius alert engine | Server logic | 5 → 10 → 20km → district → neighbours → TN |

## Quick start

```bash
npm run install:all        # install root + server + client deps
cp server/.env.example server/.env   # add your API keys
npm run db:setup           # generate Prisma client + migrate + seed
npm run dev                # server :4000, client :5173
```

Open http://localhost:5173

## Environment keys (server/.env)

```
DATABASE_URL="file:./prisma/dev.db"
OPENAI_API_KEY=...
GEMINI_API_KEY=...
REPLICATE_API_TOKEN=...
JWT_SECRET=change-me
```

## Deploy
- **Client → Netlify** (`client/netlify.toml`)
- **Server → Render** (`server/render.yaml`) with Postgres add-on
