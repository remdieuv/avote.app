const { PrismaClient } = require("@prisma/client");

/** Plafond raisonnable pour un Express long-running derrière PgBouncer (session ≤ 15). */
const DEFAULT_CONNECTION_LIMIT = 5;

/**
 * Ajoute connection_limit s’il est absent (ne remplace pas une valeur déjà fixée en env).
 * @param {string | undefined} databaseUrl
 * @param {{ connectionLimit?: number }} [opts]
 * @returns {string | undefined}
 */
function withPrismaConnectionLimit(
  databaseUrl,
  { connectionLimit = DEFAULT_CONNECTION_LIMIT } = {},
) {
  if (!databaseUrl || typeof databaseUrl !== "string") return databaseUrl;
  try {
    const u = new URL(databaseUrl);
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", String(connectionLimit));
    }
    return u.toString();
  } catch {
    return databaseUrl;
  }
}

const globalForPrisma = globalThis;

const datasourceUrl = withPrismaConnectionLimit(process.env.DATABASE_URL);

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
    ...(datasourceUrl
      ? { datasources: { db: { url: datasourceUrl } } }
      : {}),
  });

/** Singleton toujours (prod inclus) — évite plusieurs pools en cas de rechargement module. */
globalForPrisma.prisma = prisma;

module.exports = {
  prisma,
  withPrismaConnectionLimit,
  DEFAULT_CONNECTION_LIMIT,
};
