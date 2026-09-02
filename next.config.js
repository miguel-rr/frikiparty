/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import './src/env.js';

/** @type {import("next").NextConfig} */
const config = {
  // ffmpeg-static resolves its binary from its own package directory, so it
  // must load from node_modules rather than be bundled.
  serverExternalPackages: ['ffmpeg-static'],
  // The binary's path is built dynamically, which defeats file tracing:
  // include it by hand in the tRPC function that runs the video pass. The
  // real pnpm path, not the node_modules symlink — Vercel rejects function
  // packages built from symlinked directories.
  outputFileTracingIncludes: {
    '/api/trpc/[trpc]': [
      './node_modules/.pnpm/ffmpeg-static@*/node_modules/ffmpeg-static/ffmpeg',
    ],
  },
};

export default config;
