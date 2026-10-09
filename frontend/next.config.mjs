/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Pas de rewrites() vers Express.
   * - Prod : navigateur → `/api/backend` → Route Handler → Express
   * - Dev local : `NEXT_PUBLIC_API_BROWSER_BASE=http://localhost:4000`
   *   (navigateur → Express direct ; voir frontend/.env.example)
   */
};

export default nextConfig;
