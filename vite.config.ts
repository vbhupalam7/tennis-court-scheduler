import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { availabilityApiPlugin } from "./api/availabilityApi";

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

export default defineConfig({
  base: getBasePath(),
  plugins: [react(), availabilityApiPlugin()],
});
