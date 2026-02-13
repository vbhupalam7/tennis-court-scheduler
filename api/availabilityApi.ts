import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";

interface AvailabilityEntry {
  playerId: number;
  gameId: number;
}

interface AvailabilityPayload {
  entries: AvailabilityEntry[];
}

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "availability.db");

let db: DatabaseSync | null = null;

function getDatabase(): DatabaseSync {
  if (db) {
    return db;
  }

  mkdirSync(DB_DIR, { recursive: true });
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

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>
): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function normalizeEntries(input: unknown): AvailabilityEntry[] {
  if (!Array.isArray(input)) {
    throw new Error("`entries` must be an array");
  }

  const normalized = input
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const rawPlayerId = (entry as Record<string, unknown>).playerId;
      const rawGameId = (entry as Record<string, unknown>).gameId;

      if (!Number.isInteger(rawPlayerId) || !Number.isInteger(rawGameId)) {
        return null;
      }

      const playerId = Number(rawPlayerId);
      const gameId = Number(rawGameId);

      if (playerId <= 0 || gameId <= 0) {
        return null;
      }

      return { playerId, gameId };
    })
    .filter(Boolean) as AvailabilityEntry[];

  if (normalized.length > 10000) {
    throw new Error("Too many entries in one request");
  }

  const deduped = new Map<string, AvailabilityEntry>();
  for (const entry of normalized) {
    deduped.set(`${entry.playerId}:${entry.gameId}`, entry);
  }

  return [...deduped.values()];
}

function handleRead(res: ServerResponse): void {
  const database = getDatabase();
  const statement = database.prepare(`
    SELECT player_id AS playerId, game_id AS gameId
    FROM availability
    ORDER BY player_id, game_id
  `);

  const rows = statement.all() as AvailabilityEntry[];
  sendJson(res, 200, { entries: rows, source: "sqlite" });
}

function handleWrite(res: ServerResponse, payload: AvailabilityPayload): void {
  const database = getDatabase();

  try {
    database.exec("BEGIN");
    database.exec("DELETE FROM availability");

    const insert = database.prepare(`
      INSERT INTO availability (player_id, game_id)
      VALUES (?, ?)
      ON CONFLICT(player_id, game_id)
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `);

    for (const entry of payload.entries) {
      insert.run(entry.playerId, entry.gameId);
    }

    database.exec("COMMIT");
    sendJson(res, 200, { ok: true, count: payload.entries.length, source: "sqlite" });
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function createHandler() {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const url = req.url ?? "";

    if (!url.startsWith("/api/")) {
      next();
      return;
    }

    if (url === "/api/health") {
      sendJson(res, 200, { ok: true, storage: "sqlite", path: "data/availability.db" });
      return;
    }

    if (url !== "/api/availability") {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      if (req.method === "GET") {
        handleRead(res);
        return;
      }

      if (req.method === "PUT") {
        const body = (await readRequestBody(req)) as Record<string, unknown>;
        const entries = normalizeEntries(body.entries);
        handleWrite(res, { entries });
        return;
      }

      sendJson(res, 405, { error: "Method not allowed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown server error";
      sendJson(res, 500, { error: message });
    }
  };
}

function install(middlewares: Connect.Server): void {
  middlewares.use(createHandler());
}

export function availabilityApiPlugin(): Plugin {
  return {
    name: "availability-api-plugin",
    configureServer(server) {
      install(server.middlewares);
    },
    configurePreviewServer(server) {
      install(server.middlewares);
    },
  };
}
