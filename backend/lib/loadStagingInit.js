/**
 * Init ponctuelle événement charge `load-1000` — réservé DB marquées
 * `avote-railway-load-staging`. Aucune route HTTP. Hors démarrage serveur.
 */

const LOAD_STAGING_DB_MARKER = "avote-railway-load-staging";

const LOAD_SEED_IDS = Object.freeze({
  userId: "cldstguser000000000000001",
  eventId: "cldstgevt0000000000000001",
  pollId: "cldstgpoll000000000000001",
  optionOuiId: "cldstgopt0000000000000001",
  optionNonId: "cldstgopt0000000000000002",
  email: "load-staging@avote.load.local",
  slug: "load-1000",
});

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
function normalizeMarker(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s || null;
}

/**
 * @param {string | null | undefined} marker
 * @returns {{ ok: true } | { ok: false; code: string; error: string }}
 */
function assertLoadStagingDbMarker(marker) {
  const m = normalizeMarker(marker);
  if (m !== LOAD_STAGING_DB_MARKER) {
    return {
      ok: false,
      code: "LOAD_STAGING_MARKER_INVALID",
      error: `Marqueur PostgreSQL invalide (attendu ${LOAD_STAGING_DB_MARKER}, obtenu ${m ?? "null"}). Aucune écriture.`,
    };
  }
  return { ok: true };
}

/**
 * Double confirmation CLI / env (ne remplace pas le marqueur DB).
 * @param {{
 *   allowInit?: unknown;
 *   confirmLoadStaging?: unknown;
 *   railwayEnvironmentName?: unknown;
 * }} input
 */
function assertLoadStagingInitAuthorized(input = {}) {
  const allow =
    input.allowInit === true ||
    String(input.allowInit || "").trim() === "1" ||
    String(input.allowInit || "").toLowerCase() === "true";
  if (!allow) {
    return {
      ok: false,
      code: "LOAD_STAGING_INIT_LOCKED",
      error:
        "Init verrouillée. Passez LOAD_STAGING_INIT=1 et --confirm-load-staging.",
    };
  }

  const confirm =
    input.confirmLoadStaging === true ||
    String(input.confirmLoadStaging || "").trim() === "1" ||
    String(input.confirmLoadStaging || "").toLowerCase() === "true";
  if (!confirm) {
    return {
      ok: false,
      code: "LOAD_STAGING_UNCONFIRMED",
      error: "Confirmation manquante (--confirm-load-staging ou LOAD_STAGING_CONFIRM=1).",
    };
  }

  const envName = String(input.railwayEnvironmentName || "")
    .trim()
    .toLowerCase();
  // Si Railway expose le nom d'env, exiger load-staging. Si absent (shell atypique), le marqueur DB reste obligatoire.
  if (envName && envName !== "load-staging") {
    return {
      ok: false,
      code: "LOAD_STAGING_WRONG_ENV",
      error: `RAILWAY_ENVIRONMENT_NAME=${envName} refusé (attendu load-staging).`,
    };
  }

  return { ok: true };
}

/**
 * @param {{
 *   userById?: { id: string } | null;
 *   userByEmail?: { id: string } | null;
 *   eventById?: { id: string } | null;
 *   eventBySlug?: { id: string } | null;
 *   pollById?: { id: string } | null;
 *   optionOui?: { id: string } | null;
 *   optionNon?: { id: string } | null;
 * }} hits
 */
function assertNoLoadSeedCollisions(hits = {}) {
  if (hits.userById || hits.userByEmail) {
    return {
      ok: false,
      code: "LOAD_SEED_COLLISION_USER",
      error: `Collision User (id ${LOAD_SEED_IDS.userId} et/ou email ${LOAD_SEED_IDS.email}).`,
    };
  }
  if (hits.eventById || hits.eventBySlug) {
    return {
      ok: false,
      code: "LOAD_SEED_COLLISION_EVENT",
      error: `Collision Event (id ${LOAD_SEED_IDS.eventId} et/ou slug ${LOAD_SEED_IDS.slug}).`,
    };
  }
  if (hits.pollById) {
    return {
      ok: false,
      code: "LOAD_SEED_COLLISION_POLL",
      error: `Collision Poll (id ${LOAD_SEED_IDS.pollId}).`,
    };
  }
  if (hits.optionOui || hits.optionNon) {
    return {
      ok: false,
      code: "LOAD_SEED_COLLISION_OPTION",
      error: `Collision PollOption (${LOAD_SEED_IDS.optionOuiId} / ${LOAD_SEED_IDS.optionNonId}).`,
    };
  }
  return { ok: true };
}

/**
 * Lit le commentaire DB (marqueur) via Prisma.
 * @param {{ $queryRaw: Function }} db
 * @returns {Promise<string | null>}
 */
async function fetchDatabaseMarker(db) {
  const rows = await db.$queryRaw`
    SELECT pg_catalog.shobj_description(d.oid, 'pg_database') AS marker
    FROM pg_catalog.pg_database d
    WHERE d.datname = current_database()
  `;
  return normalizeMarker(rows?.[0]?.marker);
}

/**
 * Crée le jeu de données charge (sans User.role — colonne absente sur load-staging migrate-only).
 * @param {import("@prisma/client").PrismaClient} prisma
 */
async function createLoadStaging1000Dataset(prisma) {
  const ids = LOAD_SEED_IDS;

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: ids.userId,
        email: ids.email,
        passwordHash: null,
        provider: "CREDENTIALS",
        eventCredits: 0,
      },
    });

    await tx.event.create({
      data: {
        id: ids.eventId,
        userId: ids.userId,
        title: "Load test 1000",
        slug: ids.slug,
        status: "PUBLISHED",
        visibility: "PRIVATE",
        liveState: "VOTING",
        displayState: "QUESTION",
        voteState: "OPEN",
        autoReveal: true,
        autoRevealDelaySec: 5,
        questionTimerAccumulatedSec: 0,
        questionTimerIsPaused: true,
        isLiveConsumed: true,
        consumedAt: new Date(),
        isLocked: false,
        participantsLimit: 1000,
        eventPlanType: "P1000",
        landingEnabled: false,
        landingKeepPhotosAfter: true,
        landingKeepResultsAfter: true,
        landingKeepMessagesAfter: true,
        inviteEnabled: false,
        mediaProtectionEnabled: false,
        infoShowOnFinished: true,
      },
    });

    await tx.poll.create({
      data: {
        id: ids.pollId,
        eventId: ids.eventId,
        title: "Load Q1",
        question: "Choix de charge ?",
        type: "SINGLE_CHOICE",
        status: "ACTIVE",
        order: 0,
        quizRevealed: false,
        leadEnabled: false,
        formSchemaVersion: 1,
        landingResultHidden: false,
        contestWinnerCount: 1,
      },
    });

    await tx.pollOption.createMany({
      data: [
        {
          id: ids.optionOuiId,
          pollId: ids.pollId,
          label: "Oui",
          order: 0,
          isCorrect: false,
        },
        {
          id: ids.optionNonId,
          pollId: ids.pollId,
          label: "Non",
          order: 1,
          isCorrect: false,
        },
      ],
    });

    await tx.event.update({
      where: { id: ids.eventId },
      data: { activePollId: ids.pollId },
    });
  });

  return {
    eventId: ids.eventId,
    pollId: ids.pollId,
    optionId: ids.optionOuiId,
    participantsLimit: 1000,
    slug: ids.slug,
  };
}

/**
 * Orchestration complète (gardes + écriture).
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{
 *   allowInit?: unknown;
 *   confirmLoadStaging?: unknown;
 *   railwayEnvironmentName?: unknown;
 * }} auth
 */
async function runLoadStaging1000Init(prisma, auth = {}) {
  const authGate = assertLoadStagingInitAuthorized(auth);
  if (!authGate.ok) return authGate;

  const marker = await fetchDatabaseMarker(prisma);
  const markerGate = assertLoadStagingDbMarker(marker);
  if (!markerGate.ok) return markerGate;

  const ids = LOAD_SEED_IDS;
  const [userById, userByEmail, eventById, eventBySlug, pollById, optionOui, optionNon] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: ids.userId }, select: { id: true } }),
      prisma.user.findUnique({ where: { email: ids.email }, select: { id: true } }),
      prisma.event.findUnique({ where: { id: ids.eventId }, select: { id: true } }),
      prisma.event.findUnique({ where: { slug: ids.slug }, select: { id: true } }),
      prisma.poll.findUnique({ where: { id: ids.pollId }, select: { id: true } }),
      prisma.pollOption.findUnique({
        where: { id: ids.optionOuiId },
        select: { id: true },
      }),
      prisma.pollOption.findUnique({
        where: { id: ids.optionNonId },
        select: { id: true },
      }),
    ]);

  const collisionGate = assertNoLoadSeedCollisions({
    userById,
    userByEmail,
    eventById,
    eventBySlug,
    pollById,
    optionOui,
    optionNon,
  });
  if (!collisionGate.ok) return collisionGate;

  const created = await createLoadStaging1000Dataset(prisma);
  return {
    ok: true,
    marker,
    ...created,
    cleanup:
      "Après les tests : supprimer ce script + lib/loadStagingInit.js (PR de retrait), ou laisser inertes sans LOAD_STAGING_INIT=1.",
  };
}

module.exports = {
  LOAD_STAGING_DB_MARKER,
  LOAD_SEED_IDS,
  normalizeMarker,
  assertLoadStagingDbMarker,
  assertLoadStagingInitAuthorized,
  assertNoLoadSeedCollisions,
  fetchDatabaseMarker,
  createLoadStaging1000Dataset,
  runLoadStaging1000Init,
};
