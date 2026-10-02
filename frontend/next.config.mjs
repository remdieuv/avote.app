/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Pas de rewrites() vers Express : sous Windows, le proxy rewrite Next
   * (`Failed to proxy` / connect EADDRINUSE) était intermittent.
   * Unique chemin navigateur : app/api/backend/[...path]/route.js
   */
};

export default nextConfig;
