# CodeDraft - Real-Time Competitive Coding Battle Platform

> You write the problem. You win the battle.

CodeDraft is a full-stack competitive programming platform for live **1v1** and **2v2** coding battles. Participants create problems for the opposing side, solve them in a Monaco-based editor, run visible examples, and submit against hidden test cases. REST APIs manage durable resources, while Socket.IO delivers low-latency room and battle events.

## Live Application

- **Frontend:** [codedraft-frontend.onrender.com](https://codedraft-frontend.onrender.com/)
- **Backend health:** [codedraft.onrender.com/api/health](https://codedraft.onrender.com/api/health)
- **Repository:** [github.com/Dhumilkachhiya/CodeDraft](https://github.com/Dhumilkachhiya/CodeDraft)

The services run on Render's free tier, so the first request after inactivity may have a cold-start delay.

## Implemented Features

- **Peer-authored problems:** Participants define a statement, visible examples, hidden test cases, difficulty, time limit, and allowed languages.
- **1v1 and 2v2 battles:** Players join with a six-character room code and race to pass the opposing side's hidden tests.
- **Real-time collaboration:** Socket.IO powers room presence, team updates, countdowns, typing indicators, progress, language updates, and match completion.
- **2v2 teammate code sync:** Full code updates are debounced by 500 ms and routed only to the sender's teammate; typing events are throttled to once per second.
- **Reconnect restoration:** The latest code snapshot is restored when a participant reconnects to an active battle.
- **Judge0-first execution:** JavaScript, Python, C++, Java, Go, Rust, and C are mapped to Judge0 language IDs.
- **Guarded local fallback:** When Judge0 is unavailable, JavaScript, Python, C++, and C can use locally installed runtimes. JavaScript fallback is refused when the required Node permission mode is unavailable.
- **Concurrency-safe winner claim:** A conditional atomic MongoDB update allows only one correct submission to transition a room from `active` to `finished`.
- **Redis-backed scale-out state:** When Redis is configured, Socket.IO events, multi-tab presence, reconnect code snapshots, leaderboard caches, and submission rate limits are shared across backend instances.
- **BullMQ execution pipeline:** Feature-gated submission jobs are queued in Redis, retried with exponential backoff, protected by queue-depth limits, and recovered from MongoDB after a queue restart.
- **ELO rankings:** Users start at 1000 ELO. Match results use a K-factor of 32, update player statistics, and retain recent ELO history.
- **Profiles and leaderboards:** Global and college-filtered leaderboards, academic profiles, avatars, public profiles, and match history.
- **Friends and notifications:** Friend requests, battle invitations, challenge notifications, match-result notifications, and read/unread state.
- **AI-assisted authoring:** Authenticated endpoints support code conversion and candidate reference-solution generation through Gemini when configured.
- **Operational controls:** Health check, room-expiry cron, structured logging, environment validation, rate limiting, Helmet, and CORS allowlisting.

## Battle Flow

```text
Register / log in
       |
Create or join a 1v1 / 2v2 room
       |
Players are assigned to Team A or Team B
       |
Each side frames and validates a problem
       |
Host starts the synchronized countdown
       |
Team A receives Problem B; Team B receives Problem A
       |
Players code, run visible examples, and submit hidden tests
       |
First correct submission atomically claims the winner
       |
ELO, statistics, history, events, and notifications are updated
```

## Architecture

```text
React 19 + Vite 8 + Monaco Editor
        | HTTPS REST + Socket.IO
        v
Node.js 22 + Express + Socket.IO instances
   |              |                   |
MongoDB         Redis              BullMQ
durable data    shared state       pending submissions
                   |                   |
          Socket.IO adapter       integrated or separate worker
                                      |
                              Judge0 -> local fallback
```

### State Ownership

- **MongoDB:** Durable users, rooms, teams, problems, winner, ELO changes, event history, notifications, and invalidated tokens.
- **Redis:** Shared socket presence, multiple socket IDs per user, expiring code snapshots, leaderboard cache generations, distributed submission limits, and BullMQ jobs.
- **In-memory fallback:** Room presence, code snapshots, and leaderboard caching continue to work with one backend process when Redis is not configured.
- **React state:** Current editor, timer, progress, typing, and page state for one browser tab.

MongoDB is the durable source of truth. Redis contains temporary shared state and queued work, while Socket.IO transports live events. Unfinished submission documents retain the source code needed to recreate BullMQ jobs if the free Key Value instance restarts and loses its in-memory queue.

The browser uses WebSocket transport directly, allowing Socket.IO connections to be distributed across instances without long-polling session affinity.

## Real-Time Event Model

The backend handles these main client-origin events:

| Event | Purpose |
| --- | --- |
| `room:join` | Join or reconnect to a live room |
| `room:switchTeam` | Move between Team A and Team B during setup |
| `room:start` | Validate readiness and start the battle |
| `room:selectLanguage` | Persist and broadcast a player's language |
| `battle:progress` | Share visible-example progress |
| `battle:keystroke` | Share lightweight typing activity |
| `battle:codeUpdate` | Save and send code only to a 2v2 teammate |
| `battle:submit` | Execute hidden tests and attempt to claim victory |
| `battle:getSubmissionStatus` | Restore queued, processing, completed, or failed submission state after reconnecting |

Important server events include `room:playerJoined`, `room:teamUpdated`, `room:countdown`, `room:ready`, `battle:codeSync`, `battle:restoreCode`, `battle:submissionQueued`, `battle:submissionError`, `battle:submitResult`, `battle:finished`, and `notification:new`.

## Execution Model

Judge0 is always attempted first. The local executor is a fallback for runtimes installed in the backend image.

| Language | Judge0 | Local fallback | Local execution timeout |
| --- | :---: | :---: | ---: |
| JavaScript | Yes | Yes, only with Node permission support | 3 seconds |
| Python | Yes | Yes | 10 seconds |
| C++ | Yes | Yes | 10 seconds after compilation |
| C | Yes | Yes | 10 seconds after compilation |
| Java | Yes | No | Judge0-controlled |
| Go | Yes | No | Judge0-controlled |
| Rust | Yes | No | Judge0-controlled |

C and C++ compilation have a separate 15-second timeout. Local execution uses unique temporary files, process timeouts, `SIGKILL` for timed-out execution, and cleanup paths. Judge0 remains the primary isolation boundary; the local fallback is not presented as a complete production-grade sandbox.

## Security

- Password hashing with bcrypt and 12 salt rounds
- JWT authentication through an Authorization header or `httpOnly` cookie
- Server-side JWT blacklist with MongoDB TTL cleanup
- Authenticated Socket.IO handshake and per-event room authorization
- Hidden test cases kept on the backend
- Problem input validation and HTML escaping
- Helmet security headers and explicit CORS origins
- Production HTTP rate limits: authentication `5/15 min` and general API `100/min`
- Guarded JavaScript fallback that refuses unsafe execution when Node permission support is missing

## Tech Stack

### Frontend

- React 19
- Vite 8
- Tailwind CSS 4
- React Router 6
- Monaco Editor
- Socket.IO Client 4
- Axios
- Framer Motion
- Recharts
- React Hot Toast

### Backend

- Node.js 22
- Express 4
- Socket.IO 4
- Redis and the Socket.IO Redis Adapter
- BullMQ execution queues and workers
- MongoDB with Mongoose 8
- Judge0 through RapidAPI
- JSON Web Tokens and bcrypt
- Express Validator, Helmet, CORS, and Express Rate Limit
- Winston, Morgan, and node-cron

### Deployment

- Render
- One multi-stage backend Dockerfile
- MongoDB Atlas or another compatible MongoDB deployment

## Project Structure

```text
CodeDraft/
|-- backend/
|   |-- Dockerfile
|   |-- package.json
|   `-- src/
|       |-- config/
|       |-- controllers/
|       |-- middleware/
|       |-- models/
|       |-- routes/
|       |-- queues/
|       |-- services/
|       |-- sockets/
|       |-- workers/
|       `-- utils/
|-- frontend/
|   |-- package.json
|   `-- src/
|       |-- components/
|       |-- context/
|       |-- pages/
|       `-- services/
|-- render.yaml
|-- docker-compose.yml
|-- nginx.conf
`-- README.md
```

## Local Development

### Prerequisites

- Node.js 22 or a compatible current Node release
- npm
- MongoDB connection string
- Redis when testing multi-instance state or queued execution
- Judge0 RapidAPI credentials for remote execution
- Python 3, GCC, and G++ only when testing local fallback outside Docker

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Required backend variables:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_uri
JWT_SECRET=use_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
JUDGE0_API_KEY=your_rapidapi_key
JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_TIMEOUT_MS=5000
GEMINI_API_KEY=optional_for_ai_features
REDIS_URL=redis://localhost:6379
MAX_SOCKETS_PER_USER=5
SOCKET_CONNECTION_TTL_SECONDS=90
SUBMISSION_QUEUE_ENABLED=true
EXECUTION_WORKER_ENABLED=false
```

`PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and `CLIENT_URL` are validated at backend startup. Judge0 and Gemini variables are needed for their respective external integrations.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend variables:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
```

The default local frontend URL is `http://localhost:5173`.

## Docker and Render

The repository currently has one Dockerfile at `backend/Dockerfile`. It uses a multi-stage Node 22 build and installs Python 3, GCC, and G++ for supported local fallback execution.

```bash
docker build -t codedraft-backend ./backend
docker run --env-file ./backend/.env -p 5000:5000 codedraft-backend
```

For the Redis and BullMQ architecture, Docker Compose starts Redis, the API backend, and a separate execution worker. The backend keeps `EXECUTION_WORKER_ENABLED=false` because the Compose worker runs `npm run worker` independently:

```bash
docker compose up --build
```

`render.yaml` mirrors the live Virginia deployment with one free Render Key Value instance and one free Docker backend web service. Render injects the private `REDIS_URL`, enables BullMQ, and sets `EXECUTION_WORKER_ENABLED=true`, so one worker runs inside the backend process without requiring a paid Background Worker. Its concurrency is intentionally `1` because code execution shares the free web service's CPU and memory with Express and Socket.IO. The Key Value instance uses `noeviction`, which BullMQ requires so queued jobs are never silently removed to free memory.

The frontend remains a separate Render static site. After linking the repository as a Render Blueprint, `/api/health` reports Redis connectivity and whether the integrated execution worker is running.

## Current Limitations and Scaling Direction

- Redis and BullMQ remain feature-gated and are inactive unless `REDIS_URL` and `SUBMISSION_QUEUE_ENABLED=true` are configured.
- Render's free Key Value plan has no disk persistence. MongoDB-backed startup recovery recreates unfinished submission jobs, but temporary room presence, code snapshots, and cached leaderboards reset when Key Value restarts.
- The free Render deployment has one API process and one integrated worker with concurrency `1`; it improves reliability and demonstrates queueing, but it does not add CPU capacity or independent horizontal scaling.
- Local execution shares resources with the backend container and is not equivalent to a hardened multi-tenant sandbox.
- Python, C, and C++ local fallback do not currently have explicit per-job OS memory or network isolation.
- Winner selection is atomic, but Room/User ELO updates and notifications are not yet one cross-document transaction.
- BullMQ provides at-least-once processing, while MongoDB submission IDs and the atomic room transition protect against duplicate logical winners.
- Replay data exists in the Room event timeline, but a complete replay route/view is not part of the current routed application.

For a paid production rollout, set `EXECUTION_WORKER_ENABLED=false` on API services and deploy `npm run worker` as one or more separate Background Worker instances backed by persistent Key Value. That restores independent API/worker scaling and fault isolation, together with monitoring and stronger isolated execution infrastructure.

## API Groups

```text
/api/auth           Registration, login, logout, current session
/api/rooms          Room creation, retrieval, validation, problems, ratings
/api/users          Profile, leaderboards, search, friends, AI helpers
/api/matches        Authenticated user's match history
/api/profiles       Public profiles and direct challenges
/api/notifications  Notification inbox and read state
/api/admin          Authenticated telemetry
/api/health         Lightweight service health
```

## Team Members & Functional Responsibilities

- **Devam Tanna** ([@devam1912](https://github.com/devam1912)) — **User Accounts, Profiles and Social Interaction**: Responsible for registration, login/logout, JWT authentication, protected routes, profile management, user search, and friend requests.
- **Dhumil Kachhiya** ([@Dhumilkachhiya](https://github.com/Dhumilkachhiya)) — **Battle Rooms and Real-Time Collaboration**: Responsible for room creation/joining, 1v1 and 2v2 team management, lobby readiness, countdowns, live player updates, teammate code synchronization, and reconnection handling.
- **Priyanshu Dhrangdhariya** ([@Priyanshusoni7](https://github.com/Priyanshusoni7)) — **Problem Authoring and Code Evaluation**: Responsible for problem creation, visible and hidden test cases, code editor, language selection, Judge0 integration, code execution, submission processing, and AI-assisted problem authoring.
- **Digvijaysinh Dodiya** ([@Digvijaysinh430](https://github.com/Digvijaysinh430)) — **Match Results, Rankings and Notifications**: Responsible for winner finalization, ELO rating updates, global and college-wise leaderboards, match history, performance statistics, battle invitations, and notifications.

*Shared Responsibilities: Integration testing, core architecture, container orchestration, deployment, documentation, and the final demonstration.*

## License

MIT
