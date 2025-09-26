# Classroom OAuth2 Backend

## Setup

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:

```
npm install
```

3. Run dev server:

```
npm run dev
```

4. Test health:

```
curl http://localhost:4000/health
```

## Notes
- Storage is a simple JSON file store under `backend/data/` (no native deps).
- Ensure `PORT` and `GOOGLE_REDIRECT_URI` ports match. If `PORT=4000`, then:
  - `GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback`
- Keep `ENCRYPTION_KEY_BASE64` as a valid 32-byte Base64 string (with padding).

## Endpoints
- `GET /auth/google` – start OAuth2
- `GET /auth/google/callback` – OAuth2 callback
- `GET /api/me` – current user
- `GET /api/classroom/courses` – list active courses
- `POST /api/logout` – logout
