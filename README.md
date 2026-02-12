# Interview Integrity Platform

Interview Coding Platform MVP built with Next.js App Router.
It includes a candidate coding workflow, event ingestion, and an admin review experience for behavioral integrity signals.

## Tech Stack

- Next.js 16 + TypeScript
- Tailwind CSS
- Prisma + SQLite
- Monaco Editor
- Vitest + Testing Library

## Local Setup

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`.

## Core Routes

- `GET /start`: candidate/session bootstrap form
- `GET /session/[id]`: coding editor with Run Tests + Submit
- `GET /review/[id]`: admin review timeline, flags, metrics, diffs, export

## API Endpoints

- `POST /api/session`: create interview session and set signed `httpOnly` token cookie
- `POST /api/events`: ingest batched integrity events with payload validation + rate limiting
- `POST /api/session/[id]/run`: evaluate current code (mock evaluator) and persist `RUN` snapshot
- `POST /api/session/[id]/submit`: persist `SUBMIT` snapshot, mark session submitted, compute review summary
- `GET /api/review/[id]`: return metrics, flags, timeline events, snapshots, and diffs

## Integrity Signals Captured (Client)

- Focus and visibility changes
- Fullscreen enter/exit signals
- Clipboard copy/cut/paste
- Paste analysis metadata (length, lines, time since last keypress)
- Typing cadence in per-second buckets
- Inactivity periods
- Editor change deltas and large edit jumps

## Quality Commands

```bash
npm run typecheck
npm run lint
npm run test
```

## Database Commands

```bash
npx prisma migrate dev
npm run db:studio
```

## Limitations and Scope Guardrails

- This MVP is an **integrity signal aid**, not an automated misconduct verdict system.
- It captures behavioral indicators only.
- It **cannot directly detect or prove AI tool usage**.
- Signal interpretation can produce false positives; human review is required.
- Review page auth is intentionally minimal in MVP and should be hardened for production.
