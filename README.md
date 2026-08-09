# NepHR Pro — AI-Powered HRIS · HRMS · HRIM · HCM

Nepal's most comprehensive Human Resource Management SaaS platform with built-in AI business intelligence, predictive analytics, and multilingual support.

## Tech Stack
- **Frontend**: React 18 + Vite 5 + Tailwind CSS
- **Backend**: Python Flask + SQLAlchemy
- **Database**: PostgreSQL 15
- **AI**: Claude claude-sonnet-4-6 (Anthropic)
- **Cache**: Redis
- **Deployment**: Docker + Nginx

## Quick Start (Development)

```bash
# 1. Install frontend dependencies
npm install

# 2. Set environment variables
cp .env.example .env
cp backend/.env.example backend/.env
# Edit both .env files with your values

# 3. Start frontend
npm run dev

# 4. Start backend (separate terminal)
python run.py
```

## Quick Start (Docker)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with real values

docker-compose up --build
# App: http://localhost:80
# API: http://localhost:5000
```

## Project Structure

```
nephr-pro-files/
├── src/                    # React frontend
│   ├── components/
│   │   ├── dashboard/      # Role dashboards + 473 page components
│   │   ├── layout/         # Sidebar, Topbar, QuickDock
│   │   ├── shared/         # HRCopilot, Cards, StatCard etc.
│   │   └── modals/
│   ├── context/            # AppContext, AuthContext
│   ├── data/               # sidebarMenu.js, personas.js
│   ├── utils/              # auth.js, api.js, rbac.js
│   └── App.jsx             # ContentRouter (530 routes)
├── backend/
│   ├── routes/             # 105 Flask blueprint files
│   ├── models/             # 15 SQLAlchemy model files
│   ├── services/           # Auth, Email, AI, Storage, Tenant
│   ├── middleware/         # JWT auth, tenant isolation
│   └── app.py              # Flask application factory
├── database/
│   ├── schemas/            # 106 PostgreSQL schema files
│   ├── migrations/         # Alembic migrations
│   └── seeds/              # Demo data
├── legal-docs/             # Privacy policy, ToS, DPA, SLA
├── docker-compose.yml
├── nginx.conf
└── .github/workflows/      # CI/CD pipeline
```

## Key Features
- 518 sidebar menu items, all routed
- 20 language support (Nepali, Hindi, English, Arabic, Chinese...)
- macOS-style Quick Dock (role-aware)
- HR Co-Pilot AI chatbot (right-side panel)
- AI Business Intelligence with Claude API
- Predictive attrition analytics
- Nepal Labour Act 2074 compliance built-in
- Multi-tenant SaaS architecture

## Environment Variables
See `backend/.env.example` for all required variables.
Critical: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `SECRET_KEY`

## License
Proprietary — NepHR Pro © 2026
