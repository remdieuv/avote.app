"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { AdminUserContext } from "@/components/admin/AdminUserContext";

/**
 * @typedef {{
 *   id?: string;
 *   email?: string;
 *   eventCredits?: number | null;
 *   activationsAvailable?: Record<string, number> | null;
 * }} AuthUser
 */

/** @type {{ ready: boolean; user: AuthUser | null }} */
let sessionCache = { ready: false, user: null };

/** @type {Promise<{ ready: boolean; user: AuthUser | null }> | null} */
let inflight = null;

/** @type {Set<() => void>} */
const listeners = new Set();

function notifyAuthListeners() {
  for (const listener of listeners) listener();
}

/**
 * Injecte une session déjà validée (ex. AdminAuthShell) — évite un 2e /auth/me.
 * @param {AuthUser | null} user
 */
export function seedAuthSession(user) {
  const nextUser =
    user && typeof user.email === "string" && user.email.length > 0
      ? user
      : null;
  sessionCache = { ready: true, user: nextUser };
  notifyAuthListeners();
}

/** Invalide le cache (logout / session expirée confirmée) → état guest connu. */
export function clearAuthSession() {
  sessionCache = { ready: true, user: null };
  inflight = null;
  notifyAuthListeners();
}

/**
 * Remet la session en « inconnue » (ex. juste après login) :
 * UI neutre pending jusqu’au prochain /auth/me — pas de flash « Se connecter ».
 */
export function invalidateAuthSession() {
  sessionCache = { ready: false, user: null };
  inflight = null;
  notifyAuthListeners();
}

/**
 * @param {unknown} data
 * @returns {AuthUser | null}
 */
function parseAuthUser(data) {
  const u = data?.user;
  if (!u || typeof u.email !== "string" || !u.email) return null;
  const creditsRaw =
    typeof data?.eventCredits === "number"
      ? data.eventCredits
      : typeof u?.eventCredits === "number"
        ? u.eventCredits
        : null;
  const availRaw = data?.activationsAvailable ?? u?.activationsAvailable ?? null;
  return {
    id: typeof u.id === "string" ? u.id : undefined,
    email: u.email,
    eventCredits:
      creditsRaw == null || Number.isNaN(Number(creditsRaw))
        ? null
        : Math.max(0, Number(creditsRaw)),
    activationsAvailable:
      availRaw && typeof availRaw === "object" ? availRaw : null,
  };
}

/**
 * Soft-refresh : ne repasse jamais en « guest flash » tant qu’une réponse n’est pas reçue.
 * @returns {Promise<{ ready: boolean; user: AuthUser | null }>}
 */
export function refreshAuthSession() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/auth/me`, {
        cache: "no-store",
      });
      if (!res.ok) {
        sessionCache = { ready: true, user: null };
      } else {
        const data = await res.json().catch(() => ({}));
        sessionCache = { ready: true, user: parseAuthUser(data) };
      }
    } catch {
      // Réseau : conserver le cache s’il est déjà ready ; sinon guest.
      if (!sessionCache.ready) {
        sessionCache = { ready: true, user: null };
      }
    } finally {
      inflight = null;
      notifyAuthListeners();
    }
    return sessionCache;
  })();
  return inflight;
}

/**
 * Session header (public + admin). Cache module + AdminUserContext si présent.
 * @returns {{
 *   ready: boolean;
 *   isAuthed: boolean;
 *   user: AuthUser | null;
 *   logout: () => Promise<void>;
 * }}
 */
export function useAuthMe() {
  const router = useRouter();
  const adminCtx = useContext(AdminUserContext);
  const [snap, setSnap] = useState(() => sessionCache);

  useEffect(() => {
    if (adminCtx?.user) {
      seedAuthSession(adminCtx.user);
      setSnap({ ready: true, user: adminCtx.user });
      return undefined;
    }

    const onChange = () => {
      setSnap({ ready: sessionCache.ready, user: sessionCache.user });
    };
    listeners.add(onChange);
    onChange();
    void refreshAuthSession();
    return () => {
      listeners.delete(onChange);
    };
  }, [adminCtx, adminCtx?.user]);

  const logout = useCallback(async () => {
    if (adminCtx?.logout) {
      clearAuthSession();
      await adminCtx.logout();
      return;
    }
    try {
      await adminFetch(`${apiBaseBrowser()}/auth/logout`, { method: "POST" });
    } catch {
      /* best-effort */
    }
    clearAuthSession();
    router.replace("/login");
  }, [adminCtx, router]);

  if (adminCtx?.user) {
    return {
      ready: true,
      isAuthed: true,
      user: adminCtx.user,
      logout,
    };
  }

  return {
    ready: snap.ready,
    isAuthed: Boolean(snap.user?.email),
    user: snap.user,
    logout,
  };
}
