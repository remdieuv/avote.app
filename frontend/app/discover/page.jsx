import { DiscoverPageClient } from "@/components/discover/DiscoverPageClient";

export const metadata = {
  title: "Découvrir | Événements publics AVOTE",
  description:
    "Trouvez des événements publics organisés avec AVOTE : à venir, en direct, ou souvenirs. Filtrez par ville, thème ou organisateur.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Découvrir | AVOTE",
    description:
      "Annuaire public des événements AVOTE — participation et souvenirs.",
    type: "website",
  },
};

export default function DiscoverPage() {
  return <DiscoverPageClient />;
}
