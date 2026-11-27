"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { getOrCreateVoterSessionId } from "@/lib/votes/voter-session";

/**
 * Charge le payload public du mini-site `/events/slug/:slug/landing`.
 * @param {string | null} slug
 * @param {{ isDemo?: boolean }} [opts]
 */
export function useMiniSiteLanding(slug, opts = {}) {
  const router = useRouter();
  const isDemo = Boolean(opts.isDemo);
  const [loading, setLoading] = useState(!isDemo && Boolean(slug));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [payload, setPayload] = useState(
    /** @type {null | Record<string, unknown>} */ (null),
  );

  useEffect(() => {
    if (!slug || isDemo) {
      setLoading(false);
      setError(null);
      setPayload(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      let redirected = false;
      try {
        const vk = getOrCreateVoterSessionId();
        const qs = vk ? `?visitorKey=${encodeURIComponent(vk)}` : "";
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/slug/${encodeURIComponent(slug)}/landing${qs}`,
          { cache: "no-store" },
        );
        if (res.status === 404) {
          if (!cancelled) {
            setError("Événement introuvable.");
            setPayload(null);
          }
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (
          res.status === 401 &&
          (data?.code === "INVITE_REQUIRED" || data?.inviteEnabled)
        ) {
          redirected = true;
          router.replace(
            data?.invitePath || `/invite/${encodeURIComponent(slug)}`,
          );
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            setError(
              typeof data?.error === "string"
                ? data.error
                : `Erreur ${res.status}`,
            );
          }
          return;
        }
        if (!cancelled && data?.enabled === false) {
          redirected = true;
          router.replace(`/join/${encodeURIComponent(slug)}`);
          return;
        }
        if (!cancelled) setPayload(data);
      } catch {
        if (!cancelled) setError("Impossible de charger le mini-site.");
      } finally {
        if (!cancelled && !redirected) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, router, isDemo]);

  useEffect(() => {
    if (typeof document === "undefined" || !payload) return undefined;
    const seoRobots =
      payload.seo &&
      typeof payload.seo === "object" &&
      typeof /** @type {any} */ (payload.seo).robots === "string"
        ? /** @type {any} */ (payload.seo).robots
        : null;
    const visibility =
      typeof payload.visibility === "string"
        ? payload.visibility.toLowerCase()
        : "private";
    const content =
      seoRobots ||
      (visibility === "public" ? "index,follow" : "noindex,nofollow");
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
    const pageTitle =
      typeof payload.title === "string" && payload.title.trim()
        ? `${payload.title.trim()} · AVOTE`
        : null;
    const prev = document.title;
    if (pageTitle) document.title = pageTitle;
    return () => {
      if (pageTitle) document.title = prev;
    };
  }, [payload]);

  return { loading, error, payload, setPayload };
}
