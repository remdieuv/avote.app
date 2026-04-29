"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCountdownVerbose } from "@/lib/chronoFormat";
import {
  estPollNotation,
  optionsNotationOrdonnees,
} from "@/lib/notationPoll";
import {
  LIVE_UX_BODY_RESULTS_VOTES_OPEN,
  getUxState,
  getScreenResultsPillLabel,
} from "@/lib/liveStateUx";
import { API_URL } from "@/lib/config";

const RESULTATS_TOP_N = 8;

function votesOption(o) {
  return Number(o.voteCount ?? o.votes ?? 0) || 0;
}

function contestEligibleCountFromPoll(poll) {
  const opts = Array.isArray(poll?.options) ? poll.options : [];
  const triggerId = String(poll?.leadTriggerOptionId || "");
  if (!triggerId) return 0;
  const trigger = opts.find((o) => String(o?.id || "") === triggerId);
  return Number(trigger?.voteCount ?? trigger?.votes ?? 0) || 0;
}

/** @param {Record<string, unknown> | null | undefined} tm */
function chronoRestantSecondes(tm) {
  if (!tm || typeof tm.totalSec !== "number") return null;
  if (!tm.running || tm.isPaused) {
    return typeof tm.remainingSec === "number" ? tm.remainingSec : null;
  }
  if (typeof tm.startedAt !== "string") return tm.remainingSec ?? null;
  const seg = Math.floor(
    (Date.now() - new Date(tm.startedAt).getTime()) / 1000,
  );
  const acc = typeof tm.accumulatedSec === "number" ? tm.accumulatedSec : 0;
  return Math.max(0, tm.totalSec - acc - seg);
}

function preparerLignesResultats(triDesc) {
  if (triDesc.length <= RESULTATS_TOP_N) {
    return triDesc.map((opt) => ({ kind: "option", opt }));
  }
  const tete = triDesc.slice(0, RESULTATS_TOP_N);
  const reste = triDesc.slice(RESULTATS_TOP_N);
  const votesAutres = reste.reduce((s, o) => s + votesOption(o), 0);
  return [
    ...tete.map((opt) => ({ kind: "option", opt })),
    {
      kind: "autres",
      votes: votesAutres,
      nbAutres: reste.length,
    },
  ];
}

const PILL_LIVE = {
  bg: "rgba(59, 130, 246, 0.22)",
  color: "#93c5fd",
  border: "1px solid rgba(59, 130, 246, 0.5)",
};

const PILL_FINAL = {
  bg: "rgba(100, 116, 139, 0.28)",
  color: "#cbd5e1",
  border: "1px solid rgba(148, 163, 184, 0.45)",
};

const PILL_NOTATION_LIVE = {
  bg: "rgba(6, 182, 212, 0.18)",
  color: "#5eead4",
  border: "1px solid rgba(34, 211, 238, 0.45)",
};

const PILL_NOTATION_FINAL = {
  bg: "rgba(100, 116, 139, 0.28)",
  color: "#cbd5e1",
  border: "1px solid rgba(148, 163, 184, 0.45)",
};

/**
 * Résultats pour échelle / notation : moyenne + histogramme compact, sans gagnant.
 */
function ScreenResultsNotation({
  shell,
  poll,
  chronometreApi,
  chronoTick,
  voteOuvertResultats,
  barsAnimated,
}) {
  const isTestMode = poll?.eventIsLiveConsumed === false;
  const secondesChronoVote = useMemo(() => {
    void chronoTick;
    return chronoRestantSecondes(chronometreApi ?? null);
  }, [chronometreApi, chronoTick]);

  const ord = useMemo(
    () => optionsNotationOrdonnees(poll?.options ?? []),
    [poll?.options],
  );

  const totalVotes = useMemo(
    () =>
      ord.reduce((sum, { opt }) => sum + (votesOption(opt) || 0), 0),
    [ord],
  );

  const moyenne = useMemo(() => {
    if (totalVotes === 0) return null;
    let s = 0;
    for (const { opt, valeur } of ord) {
      s += valeur * votesOption(opt);
    }
    return s / totalVotes;
  }, [ord, totalVotes]);

  const distribution = useMemo(() => {
    const rows = ord
      .map(({ opt, valeur }) => ({
        opt,
        valeur,
        v: votesOption(opt),
      }))
      .filter((r) => r.v > 0)
      .sort((a, b) => a.valeur - b.valeur);
    const maxC = rows.length > 0 ? Math.max(...rows.map((r) => r.v)) : 0;
    return { rows, maxC };
  }, [ord]);

  const nbPaliersSansVote = ord.filter(({ opt }) => votesOption(opt) === 0).length;

  const questionAffichee =
    (typeof poll?.question === "string" && poll.question) ||
    (typeof poll?.title === "string" && poll.title) ||
    "Sondage";

  const pill = voteOuvertResultats ? PILL_NOTATION_LIVE : PILL_NOTATION_FINAL;
  const titrePrincipal = voteOuvertResultats
    ? "Note moyenne en direct"
    : "Note finale";

  const barScaleDone =
    !voteOuvertResultats || barsAnimated ? 1 : 0;
  const barMotionTransition = voteOuvertResultats
    ? "transform 520ms cubic-bezier(0.33, 1, 0.68, 1)"
    : "none";

  const ligneChrono = voteOuvertResultats ? (
    chronometreApi && !chronometreApi.isPaused ? (
      <span style={{ color: "#64748b", fontWeight: 600 }}>
        Chrono résultats{" "}
        <span style={{ color: "#94a3b8", fontWeight: 700 }}>·</span>{" "}
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 800,
            color:
              secondesChronoVote !== null && secondesChronoVote <= 10
                ? "#fb7185"
                : "#cbd5e1",
          }}
        >
          {secondesChronoVote !== null
            ? formatCountdownVerbose(secondesChronoVote)
            : "—"}
        </span>
      </span>
    ) : (
      <span style={{ color: "#64748b", fontWeight: 600 }}>
        Vote ouvert · résultats visibles
      </span>
    )
  ) : null;

  const formatNote = (x) =>
    x == null ? "—" : x.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

  return (
    <main style={{ ...shell, textAlign: "left" }}>
      {isTestMode ? (
        <div
          style={{
            position: "fixed",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2147483647,
            pointerEvents: "none",
            background: "rgba(0,0,0,0.55)",
            color: "#f8fafc",
            border: "1px solid rgba(148,163,184,0.35)",
            borderRadius: 9999,
            padding: "0.35rem 0.8rem",
            fontWeight: 900,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontSize: "0.78rem",
          }}
          aria-hidden
        >
          MODE TEST
        </div>
      ) : null}
      {isTestMode ? (
        <p
          style={{
            margin: "0.35rem 0 0 0",
            fontSize: "0.86rem",
            color: "#94a3b8",
            fontWeight: 700,
          }}
        >
          Mode TEST actif : résultats et exports limités.
        </p>
      ) : null}
      {isTestMode ? (
        <p
          style={{
            margin: "0.35rem 0 0 0",
            fontSize: "0.86rem",
            color: "#94a3b8",
            fontWeight: 700,
          }}
        >
          Mode TEST actif : résultats et exports limités.
        </p>
      ) : null}
      <header
        style={{
          alignSelf: "stretch",
          marginBottom: "clamp(0.85rem, 2vw, 1.25rem)",
          paddingBottom: "clamp(0.55rem, 1.2vw, 0.85rem)",
          borderBottom: "1px solid rgba(148, 163, 184, 0.18)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: "0.5rem clamp(0.65rem, 1.4vw, 1rem)",
            marginBottom: "0.45rem",
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: "clamp(0.6rem, 1.15vw, 0.72rem)",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.28rem 0.62rem",
              borderRadius: "9999px",
              background: pill.bg,
              color: pill.color,
              border: pill.border,
            }}
          >
            {getScreenResultsPillLabel(voteOuvertResultats)}
          </span>
          {voteOuvertResultats ? (
            ligneChrono
          ) : (
            <span
              style={{
                fontSize: "clamp(0.8rem, 1.55vw, 0.95rem)",
                fontWeight: 600,
                color: "#64748b",
              }}
            >
              {getUxState({ liveState: "CLOSED" }).label}
            </span>
          )}
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(1.45rem, 4vw, 2.6rem)",
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: "-0.03em",
            color: "#f0fdfa",
          }}
        >
          {titrePrincipal}
        </h1>

        <p
          style={{
            margin: "clamp(0.4rem, 1.1vw, 0.65rem) 0 0 0",
            fontSize: "clamp(0.92rem, 2.1vw, 1.12rem)",
            fontWeight: 600,
            color: "#94a3b8",
            lineHeight: 1.35,
          }}
        >
          {questionAffichee}
        </p>

        {voteOuvertResultats ? (
          <p
            style={{
              margin: "0.35rem 0 0 0",
              fontSize: "clamp(0.8rem, 1.55vw, 0.95rem)",
              fontWeight: 600,
              color: "#64748b",
            }}
          >
            Les votes continuent
          </p>
        ) : null}

        <div
          style={{
            marginTop: "clamp(1rem, 2.5vw, 1.5rem)",
            padding: "clamp(1rem, 2.5vw, 1.35rem) clamp(1.1rem, 3vw, 1.75rem)",
            borderRadius: "16px",
            background:
              "linear-gradient(165deg, rgba(13, 148, 136, 0.2) 0%, rgba(15, 23, 42, 0.75) 100%)",
            border: "1px solid rgba(45, 212, 191, 0.35)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "clamp(0.72rem, 1.4vw, 0.88rem)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#99f6e4",
            }}
          >
            {voteOuvertResultats ? "Moyenne actuelle" : "Moyenne"}
          </p>
          <p
            style={{
              margin: "0.35rem 0 0 0",
              fontSize: "clamp(3rem, 14vw, 6rem)",
              fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              color: "#f0fdfa",
              letterSpacing: "-0.04em",
            }}
          >
            {formatNote(moyenne)}
          </p>
          <p
            style={{
              margin: "0.65rem 0 0 0",
              fontSize: "clamp(0.88rem, 2vw, 1.05rem)",
              fontWeight: 600,
              color: "#94a3b8",
            }}
          >
            {totalVotes} vote{totalVotes !== 1 ? "s" : ""} au total
          </p>
        </div>
      </header>

      <section
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.65rem",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "clamp(0.65rem, 1.2vw, 0.78rem)",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Répartition des notes
        </p>

        {distribution.rows.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: "clamp(0.92rem, 2vw, 1.1rem)",
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            Pas encore de votes sur cette échelle.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.4rem, 1vw, 0.55rem)",
              overflow: "auto",
              flex: 1,
              minHeight: 0,
            }}
          >
            {distribution.rows.map(({ opt, valeur, v }) => {
              const h =
                distribution.maxC > 0
                  ? Math.round((v / distribution.maxC) * 100)
                  : 0;
              return (
                <li
                  key={opt.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(2.5rem, 4rem) 1fr minmax(4.5rem, auto)",
                    alignItems: "center",
                    gap: "0.5rem 0.75rem",
                    padding: "0.38rem 0.45rem",
                    background: "rgba(30, 41, 59, 0.45)",
                    borderRadius: "10px",
                    border: "1px solid rgba(148, 163, 184, 0.12)",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      color: "#e2e8f0",
                      textAlign: "center",
                    }}
                  >
                    {opt.label}
                  </span>
                  <div
                    style={{
                      height: "clamp(10px, 1.6vw, 14px)",
                      background: "rgba(148, 163, 184, 0.18)",
                      borderRadius: "9999px",
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: `${h}%`,
                        height: "100%",
                        background:
                          "linear-gradient(90deg, #0d9488, #5eead4)",
                        borderRadius: "9999px",
                        transform: `scaleX(${barScaleDone})`,
                        transformOrigin: "left center",
                        transition: barMotionTransition,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "#94a3b8",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {v === 1 ? "1 vote" : `${v} votes`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {nbPaliersSansVote > 0 && totalVotes > 0 ? (
          <p
            style={{
              margin: "0.35rem 0 0 0",
              fontSize: "0.72rem",
              color: "#64748b",
              fontWeight: 500,
            }}
          >
            {nbPaliersSansVote} palier{nbPaliersSansVote !== 1 ? "s" : ""} sans
            vote non affiché{nbPaliersSansVote !== 1 ? "s" : ""}.
          </p>
        ) : null}
      </section>
    </main>
  );
}

/**
 * Écran projection : résultats (observation passive, barres).
 * @param {{
 *   shell: Record<string, unknown>;
 *   poll: Record<string, unknown>;
 *   chronometreApi: Record<string, unknown> | null | undefined;
 *   chronoTick: number;
 *   voteOuvertResultats: boolean;
 *   barsAnimated: boolean;
 * }} props
 */
function ScreenResultsChoixClassiques({
  shell,
  poll,
  chronometreApi,
  chronoTick,
  voteOuvertResultats,
  barsAnimated,
}) {
  const isTestMode = poll?.eventIsLiveConsumed === false;
  const secondesChronoVote = useMemo(() => {
    void chronoTick;
    return chronoRestantSecondes(chronometreApi ?? null);
  }, [chronometreApi, chronoTick]);

  const pollOptions = poll?.options ?? [];
  const isQuiz = String(poll?.type || "").toUpperCase() === "QUIZ";
  const quizRevealed = Boolean(poll?.quizRevealed);
  const totalVotes = pollOptions.reduce(
    (sum, o) => sum + (Number(o.voteCount ?? o.votes ?? 0) || 0),
    0,
  );
  const maxVotes =
    pollOptions.length > 0
      ? Math.max(
          ...pollOptions.map((o) => Number(o.voteCount ?? o.votes ?? 0) || 0),
        )
      : -1;

  const optionsSorted = [...pollOptions].sort(
    (a, b) =>
      (Number(b.voteCount ?? b.votes ?? 0) || 0) -
      (Number(a.voteCount ?? a.votes ?? 0) || 0),
  );

  const lignesResultats = preparerLignesResultats(optionsSorted);
  const compact = pollOptions.length > 6;
  const gapList = compact
    ? "clamp(0.45rem, 1.1vw, 0.72rem)"
    : "clamp(0.72rem, 1.6vw, 1.15rem)";
  const padBloc = compact
    ? "clamp(0.5rem, 1vw, 0.72rem)"
    : "clamp(0.65rem, 1.4vw, 0.95rem)";
  const fsLabel = compact
    ? "clamp(0.95rem, 2.2vw, 1.55rem)"
    : "clamp(1.1rem, 2.6vw, 1.88rem)";
  const fsPct = compact
    ? "clamp(0.82rem, 1.6vw, 1.25rem)"
    : "clamp(0.92rem, 1.85vw, 1.4rem)";
  const barH = compact
    ? "clamp(11px, 1.8vw, 18px)"
    : "clamp(14px, 2.2vw, 24px)";

  const pill = voteOuvertResultats ? PILL_LIVE : PILL_FINAL;

  const ligneVoteChrono = (() => {
    if (!voteOuvertResultats) return null;
    const resultLabel = getUxState({
      liveState: "RESULTS",
      voteState: "OPEN",
      displayState: "RESULTS",
    }).label;
    if (!chronometreApi) {
      return (
        <span style={{ color: "#64748b", fontWeight: 600 }}>
          {resultLabel}
        </span>
      );
    }
    if (chronometreApi.isPaused) {
      return (
        <span style={{ color: "#64748b", fontWeight: 600 }}>
          {resultLabel}{" "}
          <span style={{ color: "#94a3b8", fontWeight: 700 }}>•</span> Pause
        </span>
      );
    }
    const t =
      secondesChronoVote !== null
        ? formatCountdownVerbose(secondesChronoVote)
        : "—";
    const urgent =
      secondesChronoVote !== null && secondesChronoVote <= 10;
    return (
      <span style={{ color: "#64748b", fontWeight: 600 }}>
        {resultLabel}{" "}
        <span style={{ color: "#94a3b8", fontWeight: 700 }}>•</span>{" "}
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 800,
            color: urgent ? "#fb7185" : "#cbd5e1",
          }}
        >
          {t}
        </span>
      </span>
    );
  })();

  const questionAffichee =
    (typeof poll?.question === "string" && poll.question) ||
    (typeof poll?.title === "string" && poll.title) ||
    "Sondage";

  const barFillPct = (percentRaw) => Math.min(100, percentRaw);
  /** Live : scaleX 0→1 + ease-out long ; final : barre pleine sans transition */
  const barScaleDone =
    !voteOuvertResultats || barsAnimated
      ? 1
      : 0;
  const barMotionTransition = voteOuvertResultats
    ? "transform 720ms cubic-bezier(0.33, 1, 0.68, 1)"
    : "none";

  const badgeLeaderLabel = voteOuvertResultats ? "En tête" : "Gagnant";

  return (
    <main style={{ ...shell, textAlign: "left" }}>
      {isTestMode ? (
        <div
          style={{
            position: "fixed",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2147483647,
            pointerEvents: "none",
            background: "rgba(0,0,0,0.55)",
            color: "#f8fafc",
            border: "1px solid rgba(148,163,184,0.35)",
            borderRadius: 9999,
            padding: "0.35rem 0.8rem",
            fontWeight: 900,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontSize: "0.78rem",
          }}
          aria-hidden
        >
          MODE TEST
        </div>
      ) : null}
      <header
        style={{
          alignSelf: "stretch",
          marginBottom: compact
            ? "clamp(0.72rem, 1.6vw, 1.05rem)"
            : "clamp(0.95rem, 2vw, 1.35rem)",
          paddingBottom: "clamp(0.55rem, 1.2vw, 0.85rem)",
          borderBottom: "1px solid rgba(148, 163, 184, 0.18)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: "0.5rem clamp(0.65rem, 1.4vw, 1rem)",
            marginBottom: "0.4rem",
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: "clamp(0.6rem, 1.15vw, 0.72rem)",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.28rem 0.62rem",
              borderRadius: "9999px",
              background: pill.bg,
              color: pill.color,
              border: pill.border,
              opacity: 0.95,
            }}
          >
            {getScreenResultsPillLabel(voteOuvertResultats)}
          </span>

          {voteOuvertResultats ? (
            <span
              style={{
                fontSize: "clamp(0.8rem, 1.55vw, 0.95rem)",
                letterSpacing: "-0.01em",
              }}
            >
              {ligneVoteChrono}
            </span>
          ) : (
            <span
              style={{
                fontSize: "clamp(0.8rem, 1.55vw, 0.95rem)",
                fontWeight: 600,
                color: "#64748b",
              }}
            >
              {getUxState({ liveState: "CLOSED" }).label}
            </span>
          )}
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: compact
              ? "clamp(1.35rem, 3.6vw, 2.35rem)"
              : "clamp(1.55rem, 4vw, 2.65rem)",
            fontWeight: 700,
            lineHeight: 1.14,
            letterSpacing: "-0.025em",
            color: "#e2e8f0",
          }}
        >
          {questionAffichee}
        </h1>
        {voteOuvertResultats ? (
          <p
            style={{
              margin: "clamp(0.35rem, 1vw, 0.55rem) 0 0 0",
              fontSize: "clamp(0.78rem, 1.5vw, 0.92rem)",
              fontWeight: 600,
              color: "#64748b",
            }}
          >
            {LIVE_UX_BODY_RESULTS_VOTES_OPEN}
          </p>
        ) : null}
      </header>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: gapList,
          overflow: "auto",
        }}
      >
        {lignesResultats.map((row) => {
          if (row.kind === "option") {
            const opt = row.opt;
            const optVotes = votesOption(opt);
            const percentRaw =
              totalVotes > 0 ? (optVotes / totalVotes) * 100 : 0;
            const percentRounded = Math.round(percentRaw * 10) / 10;
            const percentLabel =
              percentRounded === 0
                ? "0"
                : Number.isInteger(percentRounded)
                  ? String(percentRounded)
                  : percentRounded.toFixed(1);
            const isWinner = maxVotes > 0 && optVotes === maxVotes;
            const isQuizCorrect = isQuiz && quizRevealed && Boolean(opt?.isCorrect);
            const fillW = barFillPct(percentRaw);

            return (
              <li
                key={opt.id}
                style={{
                  flexShrink: 0,
                  ...(isQuizCorrect
                    ? {
                        padding: padBloc,
                        background: "rgba(34, 197, 94, 0.14)",
                        borderRadius: "12px",
                        borderLeft: "5px solid #22c55e",
                      }
                    : isWinner
                    ? {
                        padding: padBloc,
                        background: "rgba(234, 179, 8, 0.09)",
                        borderRadius: "12px",
                        borderLeft: "5px solid #eab308",
                      }
                    : {
                        padding: padBloc,
                        background: "rgba(30, 41, 59, 0.4)",
                        borderRadius: "12px",
                        border: "1px solid rgba(148, 163, 184, 0.1)",
                      }),
                  opacity:
                    isQuiz && quizRevealed && !isQuizCorrect
                      ? 0.52
                      : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.9rem",
                    marginBottom: "0.42rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.65rem",
                      flexWrap: "wrap",
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: fsLabel,
                        fontWeight: 700,
                        color: isQuizCorrect
                          ? "#86efac"
                          : isWinner
                            ? "#fef08a"
                            : "#e2e8f0",
                      }}
                    >
                      {opt.label}
                    </span>
                    {isQuizCorrect ? (
                      <span
                        style={{
                          fontSize: "clamp(0.65rem, 1.15vw, 0.82rem)",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: "#14532d",
                          background: "linear-gradient(180deg, #86efac, #4ade80)",
                          padding: "0.22rem 0.65rem",
                          borderRadius: "9999px",
                        }}
                      >
                        Bonne réponse
                      </span>
                    ) : isWinner ? (
                      <span
                        style={{
                          fontSize: "clamp(0.65rem, 1.15vw, 0.82rem)",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: "#422006",
                          background: "linear-gradient(180deg, #facc15, #eab308)",
                          padding: "0.22rem 0.65rem",
                          borderRadius: "9999px",
                        }}
                      >
                        {badgeLeaderLabel}
                      </span>
                    ) : null}
                  </span>
                  <span
                    style={{
                      fontSize: fsPct,
                      fontWeight: 600,
                      color: isQuizCorrect
                        ? "#4ade80"
                        : isWinner
                          ? "#fde047"
                          : "#94a3b8",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isTestMode ? (
                      <>
                        ≈ {optVotes} vote{optVotes !== 1 ? "s" : ""}
                      </>
                    ) : (
                      <>
                        {percentLabel}% · {optVotes} vote
                        {optVotes !== 1 ? "s" : ""}
                      </>
                    )}
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: barH,
                    background: "rgba(148, 163, 184, 0.2)",
                    borderRadius: "9999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${fillW}%`,
                      height: "100%",
                      background: isQuizCorrect
                        ? "linear-gradient(90deg, #16a34a, #4ade80)"
                        : isWinner
                          ? "linear-gradient(90deg, #ca8a04, #eab308)"
                          : "linear-gradient(90deg, #2563eb, #60a5fa)",
                      borderRadius: "9999px",
                      transform: `scaleX(${barScaleDone})`,
                      transformOrigin: "left center",
                      transition: barMotionTransition,
                    }}
                  />
                </div>
              </li>
            );
          }

          const optVotes = row.votes;
          const percentRaw =
            totalVotes > 0 ? (optVotes / totalVotes) * 100 : 0;
          const percentRounded = Math.round(percentRaw * 10) / 10;
          const percentLabel =
            percentRounded === 0
              ? "0"
              : Number.isInteger(percentRounded)
                ? String(percentRounded)
                : percentRounded.toFixed(1);
          const isWinner = maxVotes > 0 && optVotes === maxVotes;
          const fillW = barFillPct(percentRaw);

          return (
            <li
              key="__autres__"
              style={{
                flexShrink: 0,
                ...(isWinner
                  ? {
                      padding: padBloc,
                      background: "rgba(234, 179, 8, 0.09)",
                      borderRadius: "12px",
                      borderLeft: "5px solid #eab308",
                    }
                  : {
                      padding: padBloc,
                      background: "rgba(30, 41, 59, 0.4)",
                      borderRadius: "12px",
                      border: "1px solid rgba(148, 163, 184, 0.1)",
                    }),
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.9rem",
                  marginBottom: "0.42rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.15rem",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: fsLabel,
                      fontWeight: 700,
                      color: isWinner ? "#fef08a" : "#e2e8f0",
                    }}
                  >
                    Autres réponses
                  </span>
                  <span
                    style={{
                      fontSize: "clamp(0.72rem, 1.2vw, 0.9rem)",
                      color: "#64748b",
                      fontWeight: 600,
                    }}
                  >
                    + {row.nbAutres} réponse{row.nbAutres !== 1 ? "s" : ""}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: fsPct,
                    fontWeight: 600,
                    color: isWinner ? "#fde047" : "#94a3b8",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isTestMode ? (
                    <>
                      ≈ {optVotes} vote{optVotes !== 1 ? "s" : ""}
                    </>
                  ) : (
                    <>
                      {percentLabel}% · {optVotes} vote
                      {optVotes !== 1 ? "s" : ""}
                    </>
                  )}
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: barH,
                  background: "rgba(148, 163, 184, 0.2)",
                  borderRadius: "9999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${fillW}%`,
                    height: "100%",
                    background: isWinner
                      ? "linear-gradient(90deg, #ca8a04, #eab308)"
                      : "linear-gradient(90deg, #2563eb, #60a5fa)",
                    borderRadius: "9999px",
                    transform: `scaleX(${barScaleDone})`,
                    transformOrigin: "left center",
                    transition: barMotionTransition,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

export function ScreenResults(props) {
  const poll = props?.poll;
  const isTestMode = poll?.eventIsLiveConsumed === false;
  const isContestEntry = String(poll?.type || "").toUpperCase() === "CONTEST_ENTRY";
  const [contestWinners, setContestWinners] = useState([]);
  useEffect(() => {
    if (!isContestEntry || !poll?.id || !poll?.eventSlug) {
      setContestWinners([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({ pollId: String(poll.id) });
        const res = await fetch(
          `${API_URL}/p/${encodeURIComponent(poll.eventSlug)}/contest-status?${qs.toString()}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data || cancelled) return;
        setContestWinners(Array.isArray(data.winners) ? data.winners : []);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isContestEntry, poll?.id, poll?.eventSlug, poll?.options]);
  if (isContestEntry) {
    const questionAffichee =
      (typeof poll?.question === "string" && poll.question) ||
      (typeof poll?.title === "string" && poll.title) ||
      "Concours";
    const contestPrize =
      String(poll?.contestPrize || "").trim() || "Lot à gagner non précisé";
    const quota = Math.max(1, Number(poll?.contestWinnerCount || 1));
    const participants = contestEligibleCountFromPoll(poll);
    return (
      <main style={{ ...props.shell, textAlign: "left" }}>
        {isTestMode ? (
          <div
            style={{
              position: "fixed",
              top: 14,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 2147483647,
              pointerEvents: "none",
              background: "rgba(0,0,0,0.55)",
              color: "#f8fafc",
              border: "1px solid rgba(148,163,184,0.35)",
              borderRadius: 9999,
              padding: "0.35rem 0.8rem",
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontSize: "0.78rem",
            }}
            aria-hidden
          >
            MODE TEST
          </div>
        ) : null}
        <header
          style={{
            alignSelf: "stretch",
            marginBottom: "clamp(0.9rem, 2vw, 1.25rem)",
            paddingBottom: "clamp(0.55rem, 1.2vw, 0.85rem)",
            borderBottom: "1px solid rgba(148, 163, 184, 0.18)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: "clamp(0.6rem, 1.15vw, 0.72rem)",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.28rem 0.62rem",
              borderRadius: "9999px",
              background: "rgba(124, 58, 237, 0.22)",
              color: "#c4b5fd",
              border: "1px solid rgba(167, 139, 250, 0.55)",
            }}
          >
            Concours
          </span>
          <h1
            style={{
              margin: "0.6rem 0 0 0",
              fontSize: "clamp(1.45rem, 4vw, 2.4rem)",
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
              color: "#f0fdfa",
            }}
          >
            {questionAffichee}
          </h1>
        </header>
        <section
          style={{
            borderRadius: "14px",
            border: "1px solid rgba(167, 139, 250, 0.35)",
            background: "linear-gradient(165deg, rgba(124,58,237,0.14) 0%, rgba(15,23,42,0.75) 100%)",
            padding: "clamp(1rem, 2.5vw, 1.35rem) clamp(1.1rem, 3vw, 1.55rem)",
            display: "grid",
            gap: "0.65rem",
          }}
        >
          <p style={{ margin: 0, color: "#a78bfa", fontSize: "0.82rem", fontWeight: 700 }}>
            Lot à gagner
          </p>
          <p style={{ margin: 0, color: "#ede9fe", fontSize: "1.1rem", fontWeight: 800 }}>
            {contestPrize}
          </p>
          <p style={{ margin: "0.35rem 0 0 0", color: "#cbd5e1", fontSize: "0.96rem", fontWeight: 700 }}>
            Participants inscrits : {participants}
          </p>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>
            Gagnants à tirer : {quota}
          </p>
          <p style={{ margin: "0.2rem 0 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
            Tirage en cours en régie.
          </p>
          {contestWinners.length > 0 ? (
            <div
              style={{
                marginTop: "0.55rem",
                paddingTop: "0.55rem",
                borderTop: "1px solid rgba(148, 163, 184, 0.18)",
              }}
            >
              <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.78rem", fontWeight: 700 }}>
                Gagnants tirés
              </p>
              <ol style={{ margin: "0.4rem 0 0 1rem", padding: 0, color: "#e2e8f0", fontSize: "0.88rem" }}>
                {contestWinners.map((w) => (
                  <li key={String(w.id)} style={{ marginBottom: "0.18rem" }}>
                    {String(w.displayName || "Gagnant")} - {String(w.displayContact || "")}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>
      </main>
    );
  }
  if (props.poll && estPollNotation(props.poll)) {
    return <ScreenResultsNotation {...props} />;
  }
  return <ScreenResultsChoixClassiques {...props} />;
}
