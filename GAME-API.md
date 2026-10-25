<!-- PATH: GAME-API.md -->
# Game server API

Every /api/game/* call needs the header:  x-game-key: <GAME_API_KEY from .env>

| Call | Purpose |
|---|---|
| GET  /api/game/categories | Active complaint categories (names) for the in-game form |
| POST /api/game/complaints | Submit a complaint: { gameId, username, category, message, accusedName?, accusedGameId?, evidence?: [{ kind, url?, text?, caption? }] (max 10) } |
| GET  /api/game/complaints?gameId=ID | A player's own complaints with status and replies |
| GET  /api/game/responses | Admin replies not yet delivered to players |
| POST /api/game/responses | Confirm delivery: { ids: [responseId, ...] } |
| POST /api/game/link-codes | Staff tap "Link to website": { gameId, username } returns { code, expiresAt } (valid 10 minutes); show the code to the player |
| POST /api/game/complaints/ID/evidence | Add evidence. JSON { kind: "LINK"/"IMAGE"/"VIDEO"/"TEXT", url (https only), text, caption } or multipart/form-data with `file` (image or video, max 4 MB) and `caption` (needs BLOB_READ_WRITE_TOKEN) |
| GET  /api/game/staff?gameId=ID | { isStaff, name, title, kind, level, websiteAccess } |

Send accusedGameId whenever the accused player is known, so the website can tell if the accused is staff.