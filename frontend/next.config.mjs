/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:4000";
    const origin = String(backend).replace(/\/$/, "");
    return [
      {
        source: "/api/backend/:path*",
        destination: `${origin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
