# Orchestra V1 — First Real Vertical Slice

**An AI collaboration workspace, built end-to-end with a real AI provider for $0.00.**

Orchestra V1 is the first working vertical slice of an AI collaboration platform: give it an objective, it generates a plan with a real AI provider, you approve the plan, its worker runs research + synthesis tasks, and you get a persisted, auditable result.

Built by **Mohammad Ali** with his AI team (ChatGPT on strategy, Claude on architecture review, Grok + DeepSeek on critique, and Muse/sky on execution).

## The first real mission

> **Objective:** "Compare LangGraph, CrewAI, and AutoGen for building a multi-agent AI application. Recommend the best choice for Orchestra and explain why."

**Result — project `completed`, $0.00 spent, 31 audit events:**

| Task | Outcome |
|---|---|
| Research LangGraph Architecture | ✅ completed (real Gemini output) |
| Research CrewAI Framework | ✅ completed (real Gemini output) |
| Research AutoGen Capabilities | ✅ completed (real Gemini output) |
| Synthesize and Recommend for Orchestra | ✅ completed (real Gemini output) |

**The AI's recommendation:** LangGraph for deterministic state control and human-in-the-loop interrupts (closest to Orchestra's verifiable-work wedge) · CrewAI for rapid role-based prototyping · AutoGen for code-execution loops. Full synthesis is stored with the project.

## Architecture

```
Objective → FastAPI project → Gemini plan → 👤 human approval
    → worker: 3× research + 1× synthesis → persisted result + audit events
```

- **Backend:** FastAPI + PostgreSQL + single polling worker + thin custom orchestration
- **Provider:** Google Gemini (free tier) behind a provider-adapter boundary — OpenAI/DeepSeek adapters retained; swapping providers needs no other code changes
- **Frontend:** React + Vite + TypeScript (unchanged UI, wired to the real backend — no mock fallback)
- **Safety:** provider keys never reach the frontend · server-side input validation · explicit project boundaries · no silent fake fallback — provider errors surface visibly with retry

## Run it locally

**Prerequisites:** Python 3.12, PostgreSQL 16, Node.js LTS, a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
# 1. Database
psql -U postgres -c "CREATE USER orchestra WITH PASSWORD 'orchestra';" \
                 -c "CREATE DATABASE orchestra OWNER orchestra;"

# 2. Backend (terminal 1)
cd backend
python -m venv .venv && .venv\Scripts\activate      # Windows
# python3 -m venv .venv && source .venv/bin/activate # macOS/Linux
pip install fastapi==0.142.2 uvicorn==0.54.0 SQLAlchemy==2.1.3 \
  "psycopg[binary]==3.3.6" httpx==0.28.1 pydantic==2.13.5 python-dotenv==1.2.4

set PROVIDER=gemini                                 # cmd
set PROVIDER_API_KEY=your-key-here
set DATABASE_URL=postgresql+psycopg://orchestra:orchestra@localhost:5432/orchestra
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# 3. Worker (terminal 2) — same env vars, then:
python -m app.worker

# 4. Frontend (terminal 3)
cd ui && npm install && npm run dev
```

Open **http://localhost:5173** in Chrome. Try the objective: *"In exactly 3 bullet points, explain why the sky is blue."*

## Verification

- Backend: **21/21 tests** (`cd backend && pytest tests/`)
- Frontend: **48/48 tests** (`cd ui && npx vitest run`), TypeScript clean, production build clean

## What this is (and isn't)

A development vertical slice proving the core loop is real — not production-hardened, not deployed. The hard constraints held throughout: no UI redesign, no new product features, one real provider, no fake results, stop after the slice.

---

*Part of Mohammad Ali's AI Collaboration Workspace project — the road to an "AI Work OS".*
