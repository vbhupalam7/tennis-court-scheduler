const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const DIST_DIR = path.resolve(process.cwd(), "dist");
const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || "data");
const DB_PATH = path.join(DATA_DIR, "availability.db");

let db;

function getDb() {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });

  db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS availability (
      player_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (player_id, game_id)
    );
  `);

  return db;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function normalizeEntries(value) {
  if (!Array.isArray(value)) {
    throw new Error("`entries` must be an array");
  }

  const deduped = new Map();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const playerId = Number(item.playerId);
    const gameId = Number(item.gameId);

    if (!Number.isInteger(playerId) || !Number.isInteger(gameId)) continue;
    if (playerId <= 0 || gameId <= 0) continue;

    deduped.set(`${playerId}:${gameId}`, { playerId, gameId });
  }

  if (deduped.size > 10000) {
    throw new Error("Too many entries in one request");
  }

  return [...deduped.values()];
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function handleApi(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      storage: "sqlite",
      dbPath: DB_PATH,
    });
    return true;
  }

  if (url.pathname !== "/api/availability") {
    sendJson(res, 404, { error: "Not found" });
    return true;
  }

  if (req.method === "GET") {
    const statement = getDb().prepare(`
      SELECT player_id AS playerId, game_id AS gameId
      FROM availability
      ORDER BY player_id, game_id
    `);

    sendJson(res, 200, { entries: statement.all(), source: "sqlite" });
    return true;
  }

  if (req.method === "PUT") {
    readJsonBody(req)
      .then((body) => {
        const entries = normalizeEntries(body.entries);
        const database = getDb();

        database.exec("BEGIN");
        try {
          database.exec("DELETE FROM availability");
          const insert = database.prepare(`
            INSERT INTO availability (player_id, game_id)
            VALUES (?, ?)
            ON CONFLICT(player_id, game_id)
            DO UPDATE SET updated_at = CURRENT_TIMESTAMP
          `);

          for (const entry of entries) {
            insert.run(entry.playerId, entry.gameId);
          }

          database.exec("COMMIT");
        } catch (error) {
          database.exec("ROLLBACK");
          throw error;
        }

        sendJson(res, 200, { ok: true, count: entries.length, source: "sqlite" });
      })
      .catch((error) => {
        sendJson(res, 500, {
          error: error instanceof Error ? error.message : "Unknown server error",
        });
      });

    return true;
  }

  sendJson(res, 405, { error: "Method not allowed" });
  return true;
}

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function sendStaticFile(res, filePath) {
  fs.readFile(filePath, (error, file) => {
    if (error) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("content-type", CONTENT_TYPES[ext] || "application/octet-stream");
    res.end(file);
  });
}

const server = http.createServer((req, res) => {
  try {
    if ((req.url || "").startsWith("/api/")) {
      handleApi(req, res);
      return;
    }

    let requestPath = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).pathname;
    if (requestPath === "/") {
      requestPath = "/index.html";
    }

    const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, "");
    const filePath = path.join(DIST_DIR, safePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendStaticFile(res, filePath);
      return;
    }

    sendStaticFile(res, path.join(DIST_DIR, "index.html"));
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unknown server error",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
  console.log(`Serving static files from ${DIST_DIR}`);
  console.log(`SQLite database path: ${DB_PATH}`);
});
