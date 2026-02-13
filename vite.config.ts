import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import type { Connect, PreviewServer, ViteDevServer } from "vite";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(ROOT_DIR, "data");
const AVAILABILITY_PATH = path.join(DATA_DIR, "availability.json");

type AvailabilityEntry = {
  playerId: number;
  gameId: number;
};

const isValidEntry = (entry: unknown): entry is AvailabilityEntry => {
  if (typeof entry !== "object" || entry === null) {
    return false;
  }

  const { playerId, gameId } = entry as AvailabilityEntry;
  return Number.isInteger(playerId) && Number.isInteger(gameId);
};

const loadEntries = async (): Promise<AvailabilityEntry[]> => {
  try {
    const raw = await fs.readFile(AVAILABILITY_PATH, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidEntry);
  } catch {
    return [];
  }
};

const saveEntries = async (entries: AvailabilityEntry[]) => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(AVAILABILITY_PATH, JSON.stringify(entries, null, 2), "utf-8");
};

const registerAvailabilityRoutes = (middlewares: Connect.Server) => {
  middlewares.use("/api/availability", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.method === "GET") {
      const entries = await loadEntries();
      res.end(JSON.stringify({ entries }));
      return;
    }

    if (req.method === "PUT") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          const parsed = JSON.parse(body) as { entries?: unknown };
          if (!Array.isArray(parsed.entries)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid payload" }));
            return;
          }

          const nextEntries = parsed.entries.filter(isValidEntry);
          await saveEntries(nextEntries);
          res.end(JSON.stringify({ entries: nextEntries }));
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
  });
};

const availabilityApiPlugin = {
  name: "availability-api",
  configureServer(server: ViteDevServer) {
    registerAvailabilityRoutes(server.middlewares);
  },
  configurePreviewServer(server: PreviewServer) {
    registerAvailabilityRoutes(server.middlewares);
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), availabilityApiPlugin],
});
