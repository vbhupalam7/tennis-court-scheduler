import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import type { Plugin } from "vite";

function getBasePath() {
  const explicitBase = process.env.VITE_BASE_PATH;
  if (explicitBase) {
    return explicitBase;
  }

  const githubRepo = process.env.GITHUB_REPOSITORY;
  if (githubRepo) {
    const [, repoName] = githubRepo.split("/");
    return repoName ? `/${repoName}/` : "/";
  }

  return "/";
}

async function loadAvailabilityPlugin(): Promise<Plugin | null> {
  if (process.env.ENABLE_SQLITE_API === "false") {
    return null;
  }

  try {
    const { availabilityApiPlugin } = await import("./api/availabilityApi");
    return availabilityApiPlugin();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[vite] availability API plugin disabled: ${message}`);
    return null;
  }
}

export default defineConfig(async () => {
  const plugins: Plugin[] = [react()];
  const availabilityPlugin = await loadAvailabilityPlugin();

  if (availabilityPlugin) {
    plugins.push(availabilityPlugin);
  }

  return {
    base: getBasePath(),
    plugins,
  };
});
