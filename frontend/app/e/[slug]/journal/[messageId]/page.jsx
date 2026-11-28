import Link from "next/link";
import { API_URL } from "@/lib/config";
import { MiniSiteNewsDetailPageClient } from "./NewsDetailClient";

/**
 * @param {{ params: Promise<{ slug?: string; messageId?: string }> | { slug?: string; messageId?: string } }} props
 */
async function resolveParams(params) {
  return typeof params?.then === "function" ? await params : params || {};
}

/**
 * Métadonnées OG pour les crawlers — sans cookies d’invitation.
 * Contenu privé / journal off / masqué → noindex, pas de fuite.
 */
export async function generateMetadata({ params }) {
  const resolved = await resolveParams(params);
  const slug =
    typeof resolved.slug === "string" ? resolved.slug.trim() : "";
  const messageId =
    typeof resolved.messageId === "string" ? resolved.messageId.trim() : "";
  const fallback = {
    title: "Actualité | AVOTE",
    description: "Actualité d’événement AVOTE",
    robots: { index: false, follow: false },
  };
  if (!slug || !messageId) return fallback;

  try {
    const res = await fetch(
      `${String(API_URL).replace(/\/$/, "")}/events/slug/${encodeURIComponent(slug)}/landing/journal/${encodeURIComponent(messageId)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    if (res.status === 401) {
      return {
        title: "Événement privé | AVOTE",
        description: "Contenu réservé aux invités.",
        robots: { index: false, follow: false },
      };
    }
    if (!res.ok) {
      return fallback;
    }
    const data = await res.json().catch(() => ({}));
    const news = data?.news && typeof data.news === "object" ? data.news : null;
    if (!news) return fallback;

    const title =
      typeof news.title === "string" && news.title.trim()
        ? news.title.trim()
        : "Actualité";
    const body =
      typeof news.body === "string" ? news.body.trim().replace(/\s+/g, " ") : "";
    const description = body
      ? body.length > 160
        ? `${body.slice(0, 157)}…`
        : body
      : "Actualité d’événement AVOTE";
    const image =
      typeof news.imageUrl === "string" && news.imageUrl.trim()
        ? news.imageUrl.trim()
        : undefined;

    /** @type {Record<string, unknown>} */
    const openGraph = {
      title,
      description,
      type: "article",
    };
    if (image && /^https?:\/\//i.test(image)) {
      openGraph.images = [{ url: image }];
    }

    return {
      title: `${title} | AVOTE`,
      description,
      robots: { index: true, follow: true },
      openGraph,
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        ...(image && /^https?:\/\//i.test(image) ? { images: [image] } : {}),
      },
    };
  } catch {
    return fallback;
  }
}

/**
 * @param {{ params: Promise<{ slug?: string; messageId?: string }> | { slug?: string; messageId?: string } }} props
 */
export default async function MiniSiteNewsDetailPage({ params }) {
  const resolved = await resolveParams(params);
  const slug =
    typeof resolved.slug === "string" ? resolved.slug.trim() : "";
  const messageId =
    typeof resolved.messageId === "string" ? resolved.messageId.trim() : "";

  if (!slug || !messageId) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#b91c1c" }}>Lien invalide.</p>
        <p>
          <Link href="/">Accueil</Link>
        </p>
      </main>
    );
  }

  return (
    <MiniSiteNewsDetailPageClient slug={slug} messageId={messageId} />
  );
}
