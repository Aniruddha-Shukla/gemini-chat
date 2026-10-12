# Gemini Chat

A full-stack AI chat app: React (Vite + Tailwind) on the front, Express + MongoDB on the back, Google Gemini for replies, JWT auth.

- Register / log in (bcrypt-hashed passwords, JWT bearer tokens)
- Replies stream in token-by-token with a **Stop** button
- Chat history persisted per user in MongoDB, grouped by date in the sidebar
- Markdown rendering (tables, lists, code blocks with copy buttons)
- Responsive: sidebar becomes a drawer on mobile; light and dark mode follow the OS

## Quick start

Requirements: Node.js 20.11+, and either Docker (for local MongoDB) or a MongoDB Atlas URI.

```bash
npm install          # installs client + server (npm workspaces)
npm run db:up        # starts MongoDB in Docker on 127.0.0.1:27017
```

Add your Gemini API key (get one at https://aistudio.google.com/apikey) to `server/.env`:

```ini
GEMINI_API_KEY=your-key-here
```

Then:

```bash
npm run dev          # API on :4000 and the React app on :5173
```

Open http://localhost:5173 and create an account.

> The server starts without a Gemini key, so you can sign up and look around first; sending a message shows "Gemini is not configured yet" until the key is added. Restart `npm run dev` after editing `.env`.

## Configuration

### `server/.env`

| Variable | Required | Default | Notes |
|---|---|---|---|
| `GEMINI_API_KEY` | for chat | — | Server-side only; never sent to the browser |
| `GEMINI_MODEL` | | `gemini-3.8-flash` | Any Gemini model id, e.g. `gemini-flash-latest` |
| `MONGODB_URI` | yes | — | `mongodb://127.0.0.1:27017/gemini-chat` for the Docker DB, or an Atlas `mongodb+srv://…` URI |
| `JWT_SECRET` | yes | — | Long random string (≥ 32 chars in production). Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | | `7d` | How long a login lasts |
| `PORT` | | `4000` | Avoid 5000 on macOS (AirPlay uses it) |
| `CLIENT_URL` | | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |
| `TRUST_PROXY` | | `0` | Set to `1` behind a reverse proxy (nginx, Render, Railway…) so rate limits see real client IPs |
| `NODE_ENV` | | `development` | `production` hides internal error details and serves the built client |

### `client/.env`

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `/api` | Leave as `/api` locally (Vite proxies it to `:4000`) or when Express serves the client. Set to a full URL only if the API is on a different domain. |

Both `.env` files are git-ignored; the `.env.example` files are the templates.

## Scripts (run from the project root)

| Command | What it does |
|---|---|
| `npm run dev` | API (auto-restarts on change) + Vite dev server together |
| `npm run dev:server` / `npm run dev:client` | Run one side only |
| `npm run db:up` / `npm run db:down` | Start / stop the local MongoDB container (data is kept in a Docker volume) |
| `npm run build` | Build the React app into `client/dist` |
| `npm start` | Start the API; with `NODE_ENV=production` it also serves `client/dist` |

## Project structure

```
server/src/
  server.js            entry: connect MongoDB, start HTTP, graceful shutdown
  app.js               middleware (helmet, cors, json), routes, error handling, prod static serving
  config/              env loading/validation, Mongo connection
  models/              User (bcrypt hook), Conversation (embedded messages)
  middleware/          requireAuth (JWT), rate limits, 404 + error handler
  controllers/         auth (register/login/me), chat (list/get/delete/stream)
  routes/              /api/auth/*, /api/chats/*
  services/            gemini.service.js: the only code that touches the API key / SDK
  utils/               ApiError, JWT sign/verify

client/src/
  api/                 Axios instance + interceptors, auth and chat calls, SSE stream reader
  context/             AuthContext: user, login/register/logout, token check on load
  hooks/useChat.js     sidebar list, active conversation, streaming state
  pages/               Login, Register, Chat
  components/          auth forms + route guards, chat UI (Sidebar, MessageList, MessageBubble, Markdown, PromptInput)
```

## API

All `/api/chats` routes require `Authorization: Bearer <token>`.

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | `201 { token, user }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| GET | `/api/auth/me` | | `{ user }` |
| GET | `/api/chats` | | `{ conversations: [{ _id, title, createdAt, updatedAt }] }` |
| GET | `/api/chats/:id` | | `{ conversation }` with `messages` |
| DELETE | `/api/chats/:id` | | `204` |
| POST | `/api/chats/messages` | `{ prompt, conversationId? }` | `text/event-stream` (below) |
| GET | `/api/health` | | `{ status: "ok" }` |

`POST /api/chats/messages` omits `conversationId` to start a new chat. The reply streams as Server-Sent Events:

```
event: meta   data: {"conversationId":"…","title":"…"}
event: chunk  data: {"text":"…"}                         (repeated)
event: error  data: {"message":"…"}                      (only on failure)
event: done   data: {"conversation":{…},"userMessage":{…},"modelMessage":{…}}
```

The exchange is saved only once Gemini returns some text, so failed requests leave nothing behind. If the client disconnects (or presses Stop), generation is cancelled and the partial reply is kept.

Errors are always JSON: `{ "message": "…" }`.

## Security notes

- Passwords: bcrypt (12 rounds); hashes are never selected or returned.
- JWT: HS256 pinned on sign and verify; the user is re-loaded on every request, so deleted accounts lose access immediately.
- Inputs are type-checked (blocks `{"$gt": ""}`-style NoSQL injection); body size capped at 100 KB.
- Rate limits: 10 failed logins / 15 min per IP; 20 messages / min per user.
- Conversations are always queried by `{ _id, user }`, so one user can't read or delete another's chats (returns 404).
- Model output is rendered with `react-markdown` without raw HTML, so replies can't inject markup or scripts.
- The token lives in `localStorage` and is sent as a Bearer header. That's simple and works across domains, but any XSS could read it. For higher-risk deployments, switch to an httpOnly cookie.

## Deploying

Single service (simplest):

```bash
npm install && npm run build
NODE_ENV=production TRUST_PROXY=1 npm start
```

Set the `server/.env` variables in your host's dashboard instead of a file. Express serves the React app and the API from one origin, so `VITE_API_URL` stays `/api` and CORS doesn't matter.

Split hosting (frontend on Vercel, API on Render, database on MongoDB Atlas): see **[DEPLOY.md](DEPLOY.md)** for step-by-step instructions. The repo includes `render.yaml` and `client/vercel.json` for it.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Could not connect to MongoDB` on start | `npm run db:up` (is Docker running?) or check `MONGODB_URI` |
| "Gemini is not configured yet" | Add `GEMINI_API_KEY` to `server/.env` and restart |
| "The Gemini API key was rejected" | Key is wrong or revoked; create a new one in AI Studio |
| "The model … was not found" | Change `GEMINI_MODEL` (e.g. `gemini-flash-latest`) |
| "Cannot reach the server" in the UI | The API isn't running; check the `server` output of `npm run dev` |
| `EADDRINUSE` | Something else uses the port; change `PORT` (and the proxy target in `client/vite.config.js`) |
