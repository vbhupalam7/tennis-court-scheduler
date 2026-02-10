import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// Base path for GitHub Pages: https://<username>.github.io/<repo-name>/
// If your repo is named something else, change the base to match (e.g. base: "/my-repo/").
export default defineConfig({
  base: "/tennis-court-scheduler/",
  plugins: [react()],
});

