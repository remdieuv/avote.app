import { NextResponse } from "next/server";

export const runtime = "nodejs";

function backendOrigin() {
  const raw =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:4000";
  return String(raw).replace(/\/$/, "");
}

/** Sur Vercel, 127.0.0.1 n’existe pas : il faut une API publique (BACKEND_URL). */
function vercelBackendMisconfigured(base) {
  if (process.env.VERCEL !== "1") return false;
  try {
    const u = new URL(
      base.startsWith("http://") || base.startsWith("https://")
        ? base
        : `https://${base}`,
    );
    const h = u.hostname;
    return h === "localhost" || h === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Proxy vers l’API Express (cookies httpOnly, CORS évité).
 * Plus fiable que seuls les rewrites (Turbopack / prod / mauvaise NEXT_PUBLIC_API_URL).
 */
async function proxy(request, { params }) {
  const resolved = await params;
  const segments = resolved?.path;
  const path = Array.isArray(segments)
    ? segments.join("/")
    : typeof segments === "string"
      ? segments
      : "";
  const base = backendOrigin();
  if (vercelBackendMisconfigured(base)) {
    return NextResponse.json(
      {
        error:
          "Configuration serveur : définissez BACKEND_URL (ou NEXT_PUBLIC_API_URL) sur Vercel avec l’URL HTTPS de votre API Express déployée (pas localhost).",
      },
      { status: 503 },
    );
  }
  const url = new URL(request.url);
  const target = `${base}/${path}${url.search}`;

  const forward = new Headers();
  const incoming = request.headers;
  for (const name of ["content-type", "authorization", "cookie", "accept"]) {
    const v = incoming.get(name);
    if (v) forward.set(name, v);
  }

  let body;
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    body = await request.arrayBuffer();
  }

  let upstream;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: forward,
      body: body && body.byteLength > 0 ? body : undefined,
    });
  } catch (e) {
    console.error("[api/backend proxy]", target, e);
    return NextResponse.json(
      {
        error:
          "API injoignable. Vérifiez que le backend tourne (port 4000) et BACKEND_URL / NEXT_PUBLIC_API_URL.",
      },
      { status: 502 },
    );
  }

  const out = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  const skip = new Set([
    "content-encoding",
    "transfer-encoding",
    "connection",
    "keep-alive",
  ]);

  const setCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];

  if (setCookies.length > 0) {
    for (const c of setCookies) {
      out.headers.append("set-cookie", c);
    }
  }

  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (skip.has(k)) return;
    if (k === "set-cookie" && setCookies.length > 0) return;
    try {
      out.headers.set(key, value);
    } catch {
      /* ignore en-têtes non transférables */
    }
  });

  return out;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
