const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const slug = "demo";
  const existing = await prisma.event.findUnique({ where: { slug } });
  if (existing) {
    console.log("Seed : événement demo déjà présent, rien à faire.");
    return;
  }

  const event = await prisma.event.create({
    data: {
      title: "Événement démo",
      slug,
      status: "PUBLISHED",
      liveState: "VOTING",
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
