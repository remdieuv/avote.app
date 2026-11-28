"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EventLandingDemoPage } from "@/components/event/EventLandingDemoPage";
import { LandingEvenementPresentation } from "@/components/event/LandingEvenementPresentation";
import { LandingHybridFeed } from "@/components/event/LandingHybridFeed";
import {
  LandingPhotoLightbox,
  normalizeLightboxPhotos,
} from "@/components/event/LandingPhotoLightbox";
import { MiniSiteHome } from "@/components/minisite/MiniSiteHome";
import { MiniSiteJournalPreview } from "@/components/minisite/MiniSiteJournal";
import { MiniSiteShell } from "@/components/minisite/MiniSiteShell";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import {
  getLandingEvenementLead,
  getLandingFeedSubtitle,
  shouldShowLandingFeedBlock,
} from "@/lib/landingFeedCopy";
import {
  shouldShowLandingEvenementSection,
  sortLandingProgramItems,
} from "@/lib/landingEventPresentation";
import { marketingContentMaxWidth } from "@/lib/marketingLayout";
import { resolveEventLandingPhase } from "@/lib/participantLiveFlow";
import { getOrCreateVoterSessionId } from "@/lib/votes/voter-session";
import { useMiniSiteLanding } from "@/lib/useMiniSiteLanding";

/**
 * Mini-site — Accueil (Lot 1 + Lot 3 aperçu Journal).
 * Fil hybride conservé si Journal désactivé ; aperçu Journal sinon.
 */
export default function EventLandingPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? null;
  const isDemoSlug = slug === "demo";

  const { loading, error, payload, setPayload } = useMiniSiteLanding(slug, {
    isDemo: isDemoSlug,
  });

  const [showcaseLightboxIndex, setShowcaseLightboxIndex] = useState(
    /** @type {number | null} */ (null),
  );

  const softRefreshLiveState =
    typeof payload?.liveState === "string" ? payload.liveState : null;
  const softRefreshVoteState =
    typeof payload?.voteState === "string" ? payload.voteState : null;
  const softRefreshDisplayState =
    typeof payload?.displayState === "string" ? payload.displayState : null;
  const softRefreshReady = Boolean(payload) && !isDemoSlug && Boolean(slug);

  useEffect(() => {
    if (!softRefreshReady || !slug) return undefined;
    const phase = resolveEventLandingPhase({
      liveState: softRefreshLiveState,
      voteState: softRefreshVoteState,
      displayState: softRefreshDisplayState,
    });
    if (phase !== "during" && phase !== "after") return undefined;
    let cancelled = false;
    const softRefresh = async () => {
      try {
        const vk = getOrCreateVoterSessionId();
        const qs = vk ? `?visitorKey=${encodeURIComponent(vk)}` : "";
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/slug/${encodeURIComponent(slug)}/landing${qs}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const data = await res.json().catch(() => null);
        if (!cancelled && data && data.enabled !== false) setPayload(data);
      } catch {
        /* ignore soft refresh errors */
      }
    };
    const id = window.setInterval(softRefresh, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    softRefreshReady,
    slug,
    softRefreshLiveState,
    softRefreshVoteState,
    softRefreshDisplayState,
    setPayload,
  ]);

  const showcaseLightboxPhotos = useMemo(() => {
    if (!payload) return [];
    return normalizeLightboxPhotos(
      Array.isArray(payload.showcasePhotos) ? payload.showcasePhotos : [],
    );
  }, [payload]);

  if (isDemoSlug) {
    return <EventLandingDemoPage />;
  }

  if (!slug) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#b91c1c" }}>Lien invalide.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "40vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#64748b",
        }}
      >
        Chargement du mini-site…
      </main>
    );
  }

  if (error || !payload) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#b91c1c" }}>{error || "Mini-site indisponible."}</p>
        <p>
          <Link href={`/join/${encodeURIComponent(slug)}`}>
            Accéder à la salle
          </Link>
        </p>
      </main>
    );
  }

  const landingPhase = resolveEventLandingPhase({
    liveState: typeof payload.liveState === "string" ? payload.liveState : null,
    voteState: typeof payload.voteState === "string" ? payload.voteState : null,
    displayState:
      typeof payload.displayState === "string" ? payload.displayState : null,
  });
  const afterLive = landingPhase === "after";

  const landingEventDate =
    typeof payload.landingEventDate === "string"
      ? payload.landingEventDate.trim()
      : "";
  const landingVenue =
    typeof payload.landingVenue === "string" ? payload.landingVenue.trim() : "";
  const landingHours =
    typeof payload.landingHours === "string" ? payload.landingHours.trim() : "";
  const programItemsList = sortLandingProgramItems(
    Array.isArray(payload.programItems) ? payload.programItems : [],
  ).filter(
    (step) =>
      String(step?.timeLabel || "").trim() && String(step?.title || "").trim(),
  );
  const showcasePhotosList = Array.isArray(payload.showcasePhotos)
    ? payload.showcasePhotos
    : [];
  const landingIntroBody =
    typeof payload.landingIntroBody === "string"
      ? payload.landingIntroBody.trim()
      : "";
  const landingThanksBody =
    typeof payload.landingThanksBody === "string"
      ? payload.landingThanksBody.trim()
      : "";
  const showEvenementSection = shouldShowLandingEvenementSection({
    landingEventDate,
    landingVenue,
    landingHours,
    programItems: programItemsList,
    showcasePhotos: showcasePhotosList,
    landingIntroBody,
    landingThanksBody,
    afterLive,
  });

  const feedItems = Array.isArray(payload.feed) ? payload.feed : [];
  const journalTabOn =
    payload.miniSiteTabJournal === true ||
    (Array.isArray(payload.tabs) &&
      payload.tabs.some((t) => t && t.id === "journal" && t.enabled === true));
  const journalPreviewItems = Array.isArray(payload.journalPreview)
    ? payload.journalPreview
    : [];
  const showFeedBlock =
    !journalTabOn &&
    shouldShowLandingFeedBlock({
      phase: landingPhase,
      hasItems: feedItems.length > 0,
      canUpload: false,
    });
  const accent =
    typeof payload.primaryColor === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(payload.primaryColor.trim())
      ? payload.primaryColor.trim()
      : "#0f766e";

  return (
    <MiniSiteShell
      slug={slug}
      activeTab="accueil"
      primaryColor={
        typeof payload.primaryColor === "string" ? payload.primaryColor : null
      }
      tabs={payload.tabs}
    >
      <MiniSiteHome slug={slug} payload={payload} />

      <div
        style={{
          maxWidth: marketingContentMaxWidth(),
          margin: "0 auto",
          padding: "0 clamp(1.15rem, 4vw, 2rem) 1rem",
          boxSizing: "border-box",
        }}
      >
        {showEvenementSection ? (
          <LandingEvenementPresentation
            accent={accent}
            lead={getLandingEvenementLead({ phase: landingPhase })}
            afterLive={afterLive}
            landingEventDate={landingEventDate}
            landingVenue={landingVenue}
            landingHours={landingHours}
            introTitle={
              typeof payload.landingIntroTitle === "string"
                ? payload.landingIntroTitle.trim()
                : ""
            }
            introBody={landingIntroBody}
            introPhotos={
              Array.isArray(payload.landingIntroPhotos)
                ? payload.landingIntroPhotos
                : []
            }
            thanksTitle={
              typeof payload.landingThanksTitle === "string"
                ? payload.landingThanksTitle.trim()
                : ""
            }
            thanksBody={landingThanksBody}
            thanksPhotos={
              Array.isArray(payload.landingThanksPhotos)
                ? payload.landingThanksPhotos
                : []
            }
            programItems={programItemsList}
            showcasePhotos={showcasePhotosList}
            onOpenPhoto={(id) => {
              const idx = showcaseLightboxPhotos.findIndex(
                (x) => x.id === String(id),
              );
              if (idx >= 0) setShowcaseLightboxIndex(idx);
            }}
          />
        ) : null}

        <LandingPhotoLightbox
          open={
            showcaseLightboxIndex != null && showcaseLightboxPhotos.length > 0
          }
          photos={showcaseLightboxPhotos}
          index={showcaseLightboxIndex ?? 0}
          onClose={() => setShowcaseLightboxIndex(null)}
          onIndexChange={setShowcaseLightboxIndex}
        />

        {journalTabOn ? (
          <MiniSiteJournalPreview
            slug={slug}
            items={journalPreviewItems}
            accent={accent}
          />
        ) : null}

        {showFeedBlock ? (
          <LandingHybridFeed
            accent={accent}
            items={feedItems}
            canManage={false}
            kicker={
              landingPhase === "after"
                ? "Souvenirs"
                : landingPhase === "during"
                  ? "En direct"
                  : "Journal"
            }
            subtitle={getLandingFeedSubtitle({ phase: landingPhase })}
            emptyHint={null}
          />
        ) : null}
      </div>
    </MiniSiteShell>
  );
}
