import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const githubPagesBase = process.env.GITHUB_PAGES_BASE?.trim() || "/";

if (
  githubPagesBase !== "/" &&
  !/^\/[a-zA-Z0-9._/-]+\/$/.test(githubPagesBase)
) {
  throw new Error(
    "GITHUB_PAGES_BASE must be / or a slash-wrapped repository path.",
  );
}

export default defineConfig({
  base: githubPagesBase,
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
