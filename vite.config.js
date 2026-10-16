import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'latest';
  }
})();

const commitMsg = process.env.VERCEL_GIT_COMMIT_MESSAGE || (() => {
  try {
    return execSync('git log -1 --pretty=%s').toString().trim();
  } catch {
    return 'تحديث مباشر للمنظومة';
  }
})();

const buildTime = new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
    __APP_COMMIT_SHA__: JSON.stringify(commitSha),
    __APP_COMMIT_MSG__: JSON.stringify(commitMsg),
  },
  server: {
    port: 3000,
    open: false
  }
})
