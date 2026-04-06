const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const slug = "demo";
  const existing = await prisma.event.findUnique({ where: { slug } });
  if (existing) {
    console.log("Seed : événement demo déjà présent, rien à faire.");
    return;
  }

  let owner = await prisma.user.findFirst({
    where: { email: "legacy@avote.local" },
  });
  if (!owner) {
    owner = await prisma.user.findFirst();
  }
  if (!owner) {
    const email = "seed@avote.local";
    const passwordHash = await bcrypt.hash(
      process.env.SEED_OWNER_PASSWORD || "seedpassword",
      11,
    );
    owner = await prisma.user.create({
      data: {
        email,
        passwordHash,
        provider: "CREDENTIALS",
      },
    });
    console.log(
      "Seed : utilisateur créé",
      email,
      "(SEED_OWNER_PASSWORD ou mot de passe par défaut seedpassword).",
    );
  } else if (!owner.passwordHash) {
    await prisma.user.update({
      where: { id: owner.id },
      data: {
        passwordHash: await bcrypt.hash(
          process.env.DEV_LEGACY_PASSWORD || "devpassword",
          11,
        ),
      },
    });
    console.log(
      "Seed : mot de passe défini pour l’utilisateur existant (DEV_LEGACY_PASSWORD ou devpassword).",
    );
  }

  const event = await prisma.event.create({
    data: {
      title: "Événement démo",
      slug,
      status: "PUBLISHED",
      liveState: "VOTING",
      userId: owner.id,
    },
  });

  const poll = await prisma.poll.create({
    data: {
      eventId: event.id,
      title: "Quel est ton choix ?",
      question: "Quel est ton choix ?",
      type: "SINGLE_CHOICE",
      status: "ACTIVE",
      order: 0,
      options: {
        create: [
          { label: "Oui", order: 0 },
          { label: "Non", order: 1 },
          { label: "Peut-être", order: 2 },
        ],
      },
    },
  });

  await prisma.event.update({
    where: { id: event.id },
    data: { activePollId: poll.id },
  });

  console.log("Seed OK : événement slug=demo, sondage actif prêt.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
