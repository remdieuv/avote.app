# Squelette initial Avote.app

## 1. Structure minimale des fichiers clés

```bash
avote-app/
├── app/
│   ├── (dashboard)/
│   │   └── evenements/
│   │       └── [eventId]/
│   │           └── live/
│   │               └── page.tsx
│   ├── p/
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── live/
│   │   └── [eventSlug]/
│   │       └── page.tsx
│   ├── api/
│   │   ├── polls/
│   │   │   └── [pollId]/
│   │   │       ├── public/
│   │   │       │   └── route.ts
│   │   │       ├── vote/
│   │   │       │   └── route.ts
│   │   │       └── results/
│   │   │           └── route.ts
│   │   └── live/
│   │       └── [eventId]/
│   │           ├── state/
│   │           │   └── route.ts
│   │           ├── next-poll/
│   │           │   └── route.ts
│   │           └── show-results/
│   │               └── route.ts
├── components/
│   ├── voting/
│   │   ├── PublicPollView.tsx
│   │   ├── VoteConfirmationBanner.tsx
│   │   ├── AlreadyVotedBanner.tsx
│   │   └── PollOptionButton.tsx
│   └── live/
│       ├── LiveControlPanel.tsx
│       ├── LiveVotingScreen.tsx
│       └── LiveResultsScreen.tsx
├── hooks/
│   ├── useVote.ts
│   ├── useLocalVoteState.ts
│   └── useLiveResults.ts
├── lib/
│   ├── db/
│   │   └── prisma.ts
│   ├── votes/
│   │   └── local-vote-storage.ts
│   └── realtime/
│       └── events.ts
├── server/
│   └── services/
│       ├── poll.service.ts
│       ├── vote.service.ts
│       └── live.service.ts
├── types/
│   ├── poll.ts
│   ├── vote.ts
│   └── live.ts
└── prisma/
    └── schema.prisma
```

---

## 2. Contenu initial des fichiers clés

### `types/poll.ts`
```ts
export type PollStatus = "draft" | "scheduled" | "active" | "closed" | "archived";
export type PollType =
  | "single_choice"
  | "multiple_choice"
  | "yes_no"
  | "rating"
  | "ranking"
  | "open_text"
  | "word_cloud"
  | "quiz";

export type PollOption = {
  id: string;
  label: string;
  order: number;
  imageUrl?: string | null;
};

export type PublicPollDto = {
  id: string;
  eventId: string;
  eventSlug: string;
  title: string;
  question: string;
  type: PollType;
  status: PollStatus;
  options: PollOption[];
  totalVotes: number;
  allowMultiple: boolean;
  showResultsLive: boolean;
};

export type PollResultsDto = {
  pollId: string;
  totalVotes: number;
  results: Array<{
    optionId: string;
    label: string;
    votes: number;
    percentage: number;
  }>;
};
```

### `types/vote.ts`
```ts
export type VotePayload = {
  optionIds: string[];
  voterSessionId: string;
};

export type VoteResponse = {
  ok: boolean;
  alreadyVoted: boolean;
  message?: string;
};
```

### `types/live.ts`
```ts
export type LiveState = "waiting" | "voting" | "results" | "paused" | "finished";

export type EventLiveStateDto = {
  eventId: string;
  eventSlug: string;
  activePollId: string | null;
  liveState: LiveState;
  showResults: boolean;
};
```

### `lib/db/prisma.ts`
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### `lib/votes/local-vote-storage.ts`
```ts
const PREFIX = "avote:voted:";

export type StoredVote = {
  pollId: string;
  votedAt: string;
};

export function getVoteStorageKey(pollId: string) {
  return `${PREFIX}${pollId}`;
}

export function getStoredVote(pollId: string): StoredVote | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(getVoteStorageKey(pollId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredVote;
  } catch {
    return null;
  }
}

export function hasStoredVote(pollId: string): boolean {
  return !!getStoredVote(pollId);
}

export function setStoredVote(pollId: string): void {
  if (typeof window === "undefined") return;

  const value: StoredVote = {
    pollId,
    votedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(getVoteStorageKey(pollId), JSON.stringify(value));
}

export function removeStoredVote(pollId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getVoteStorageKey(pollId));
}
```

### `lib/realtime/events.ts`
```ts
export const realtimeEvents = {
  POLL_ACTIVATED: "poll_activated",
  POLL_CLOSED: "poll_closed",
  VOTE_CREATED: "vote_created",
  RESULTS_UPDATED: "results_updated",
  LIVE_STATE_CHANGED: "live_state_changed",
} as const;
```

### `hooks/useLocalVoteState.ts`
```ts
"use client";

import { useEffect, useState } from "react";
import { hasStoredVote } from "@/lib/votes/local-vote-storage";

export function useLocalVoteState(pollId: string | null) {
  const [aDejaVoteEnStockage, setADejaVoteEnStockage] = useState(false);

  useEffect(() => {
    if (!pollId) {
      setADejaVoteEnStockage(false);
      return;
    }

    setADejaVoteEnStockage(hasStoredVote(pollId));
  }, [pollId]);

  return {
    aDejaVoteEnStockage,
    setADejaVoteEnStockage,
  };
}
```

### `hooks/useVote.ts`
```ts
"use client";

import { flushSync } from "react-dom";
import { useState } from "react";
import { setStoredVote } from "@/lib/votes/local-vote-storage";
import type { VoteResponse } from "@/types/vote";

type UseVoteParams = {
  pollId: string;
  onAfterSuccessReload: () => Promise<void>;
};

export function useVote({ pollId, onAfterSuccessReload }: UseVoteParams) {
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [merciPourVote, setMerciPourVote] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submitVote(optionIds: string[], voterSessionId: string) {
    setErrorMessage(null);
    setIsSubmittingVote(true);

    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds, voterSessionId }),
      });

      const data = (await res.json()) as VoteResponse;

      if (!res.ok || !data.ok) {
        setErrorMessage(data.message ?? "Impossible d'enregistrer le vote.");
        return { ok: false };
      }

      setStoredVote(pollId);
      await onAfterSuccessReload();

      flushSync(() => {
        setMerciPourVote(true);
      });

      return { ok: true };
    } catch {
      setErrorMessage("Une erreur est survenue pendant le vote.");
      return { ok: false };
    } finally {
      setIsSubmittingVote(false);
    }
  }

  return {
    isSubmittingVote,
    merciPourVote,
    setMerciPourVote,
    errorMessage,
    submitVote,
  };
}
```

### `hooks/useLiveResults.ts`
```ts
"use client";

import { useEffect, useState } from "react";
import type { PollResultsDto } from "@/types/poll";

export function useLiveResults(pollId: string | null) {
  const [results, setResults] = useState<PollResultsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!pollId) {
        setResults(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const res = await fetch(`/api/polls/${pollId}/results`, { cache: "no-store" });
      const data = (await res.json()) as PollResultsDto;

      if (!cancelled) {
        setResults(data);
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [pollId]);

  return { results, isLoading, setResults };
}
```

### `components/voting/VoteConfirmationBanner.tsx`
```tsx
export function VoteConfirmationBanner() {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      Merci pour votre vote !
    </div>
  );
}
```

### `components/voting/AlreadyVotedBanner.tsx`
```tsx
export function AlreadyVotedBanner() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      Vous avez déjà voté pour ce sondage.
    </div>
  );
}
```

### `components/voting/PollOptionButton.tsx`
```tsx
import type { PollOption } from "@/types/poll";

type Props = {
  option: PollOption;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
};

export function PollOptionButton({ option, selected, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${selected ? "border-black" : "border-neutral-200"} ${disabled ? "opacity-60" : "hover:border-neutral-400"}`}
    >
      {option.label}
    </button>
  );
}
```

### `components/voting/PublicPollView.tsx`
```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { AlreadyVotedBanner } from "@/components/voting/AlreadyVotedBanner";
import { PollOptionButton } from "@/components/voting/PollOptionButton";
import { VoteConfirmationBanner } from "@/components/voting/VoteConfirmationBanner";
import { useLocalVoteState } from "@/hooks/useLocalVoteState";
import { useVote } from "@/hooks/useVote";
import type { PublicPollDto } from "@/types/poll";

type Props = {
  slug: string;
};

export function PublicPollView({ slug }: Props) {
  const [poll, setPoll] = useState<PublicPollDto | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadPoll() {
    setIsLoading(true);
    const res = await fetch(`/api/polls/${slug}/public`, { cache: "no-store" });
    const data = (await res.json()) as PublicPollDto;
    setPoll(data);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadPoll();
  }, [slug]);

  const pollId = poll?.id ?? null;
  const { aDejaVoteEnStockage } = useLocalVoteState(pollId);
  const { isSubmittingVote, merciPourVote, errorMessage, submitVote } = useVote({
    pollId: poll?.id ?? "",
    onAfterSuccessReload: loadPoll,
  });

  const isDisabled = useMemo(() => {
    return isSubmittingVote || merciPourVote || aDejaVoteEnStockage;
  }, [isSubmittingVote, merciPourVote, aDejaVoteEnStockage]);

  if (isLoading) return <div>Chargement…</div>;
  if (!poll) return <div>Sondage introuvable.</div>;

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      {merciPourVote ? <VoteConfirmationBanner /> : null}
      {!merciPourVote && aDejaVoteEnStockage ? <AlreadyVotedBanner /> : null}
      {errorMessage ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMessage}</div> : null}

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{poll.title}</h1>
        <p className="text-base text-neutral-700">{poll.question}</p>
      </div>

      <div className="space-y-3">
        {poll.options.map((option) => (
          <PollOptionButton
            key={option.id}
            option={option}
            selected={selectedOptionId === option.id}
            disabled={isDisabled}
            onClick={() => setSelectedOptionId(option.id)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={!selectedOptionId || isDisabled}
        className="w-full rounded-2xl bg-black px-4 py-4 text-white disabled:opacity-50"
        onClick={async () => {
          if (!selectedOptionId || !poll.id) return;
          await submitVote([selectedOptionId], crypto.randomUUID());
        }}
      >
        Voter
      </button>

      <div className="text-sm text-neutral-500">{poll.totalVotes} vote(s)</div>
    </div>
  );
}
```

### `components/live/LiveControlPanel.tsx`
```tsx
"use client";

type Props = {
  eventId: string;
};

export function LiveControlPanel({ eventId }: Props) {
  async function call(path: string) {
    await fetch(path, { method: "POST" });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button className="rounded-xl border px-4 py-2" onClick={() => call(`/api/live/${eventId}/state`)}>
        Mettre en vote
      </button>
      <button className="rounded-xl border px-4 py-2" onClick={() => call(`/api/live/${eventId}/show-results`)}>
        Afficher résultats
      </button>
      <button className="rounded-xl border px-4 py-2" onClick={() => call(`/api/live/${eventId}/next-poll`)}>
        Sondage suivant
      </button>
    </div>
  );
}
```

### `components/live/LiveVotingScreen.tsx`
```tsx
import type { PublicPollDto } from "@/types/poll";

export function LiveVotingScreen({ poll }: { poll: PublicPollDto }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-4xl text-center">
        <div className="mb-4 text-sm uppercase tracking-wide text-neutral-500">Vote en cours</div>
        <h1 className="text-5xl font-bold">{poll.question}</h1>
      </div>
    </div>
  );
}
```

### `components/live/LiveResultsScreen.tsx`
```tsx
import type { PollResultsDto } from "@/types/poll";

export function LiveResultsScreen({ results }: { results: PollResultsDto }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-8">
      <h1 className="text-4xl font-bold">Résultats</h1>
      <div className="space-y-3">
        {results.results.map((item) => (
          <div key={item.optionId} className="space-y-1">
            <div className="flex items-center justify-between text-lg">
              <span>{item.label}</span>
              <span>{item.percentage}%</span>
            </div>
            <div className="h-4 rounded-full bg-neutral-200">
              <div className="h-4 rounded-full bg-black" style={{ width: `${item.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### `app/p/[slug]/page.tsx`
```tsx
import { PublicPollView } from "@/components/voting/PublicPollView";

export default async function PublicPollPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicPollView slug={slug} />;
}
```

### `app/live/[eventSlug]/page.tsx`
```tsx
export default async function LiveEventPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  return <div>Écran live public : {eventSlug}</div>;
}
```

### `app/(dashboard)/evenements/[eventId]/live/page.tsx`
```tsx
import { LiveControlPanel } from "@/components/live/LiveControlPanel";

export default async function EventLiveAdminPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Pilotage live</h1>
      <LiveControlPanel eventId={eventId} />
    </div>
  );
}
```

### `server/services/poll.service.ts`
```ts
import { prisma } from "@/lib/db/prisma";

export async function getPublicPollBySlug(slug: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      polls: {
        where: { status: "ACTIVE" },
        include: { options: { orderBy: { order: "asc" } }, votes: true },
        orderBy: { order: "asc" },
        take: 1,
      },
    },
  });

  const poll = event?.polls[0];
  if (!event || !poll) return null;

  return {
    id: poll.id,
    eventId: event.id,
    eventSlug: event.slug,
    title: poll.title,
    question: poll.question,
    type: poll.type.toLowerCase(),
    status: poll.status.toLowerCase(),
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      order: option.order,
      imageUrl: option.imageUrl,
    })),
    totalVotes: poll.votes.length,
    allowMultiple: false,
    showResultsLive: true,
  };
}
```

### `server/services/vote.service.ts`
```ts
import { prisma } from "@/lib/db/prisma";

type SubmitVoteInput = {
  pollId: string;
  optionIds: string[];
  voterSessionId: string;
};

export async function submitVote(input: SubmitVoteInput) {
  const existing = await prisma.vote.findFirst({
    where: {
      pollId: input.pollId,
      voterSessionId: input.voterSessionId,
    },
  });

  if (existing) {
    return {
      ok: false,
      alreadyVoted: true,
      message: "Vous avez déjà voté pour ce sondage.",
    };
  }

  await prisma.vote.createMany({
    data: input.optionIds.map((optionId) => ({
      pollId: input.pollId,
      optionId,
      voterSessionId: input.voterSessionId,
    })),
  });

  return {
    ok: true,
    alreadyVoted: false,
  };
}
```

### `server/services/live.service.ts`
```ts
import { prisma } from "@/lib/db/prisma";

export async function setEventLiveState(eventId: string, liveState: "WAITING" | "VOTING" | "RESULTS" | "PAUSED" | "FINISHED") {
  return prisma.event.update({
    where: { id: eventId },
    data: { liveState },
  });
}
```

### `app/api/polls/[pollId]/vote/route.ts`
```ts
import { NextResponse } from "next/server";
import { submitVote } from "@/server/services/vote.service";

export async function POST(request: Request, context: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await context.params;
  const body = (await request.json()) as {
    optionIds: string[];
    voterSessionId: string;
  };

  const result = await submitVote({
    pollId,
    optionIds: body.optionIds,
    voterSessionId: body.voterSessionId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
```

### `app/api/polls/[pollId]/results/route.ts`
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(_: Request, context: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await context.params;

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: { orderBy: { order: "asc" } },
      votes: true,
    },
  });

  if (!poll) {
    return NextResponse.json({ message: "Poll not found" }, { status: 404 });
  }

  const totalVotes = poll.votes.length;
  const results = poll.options.map((option) => {
    const votes = poll.votes.filter((vote) => vote.optionId === option.id).length;
    return {
      optionId: option.id,
      label: option.label,
      votes,
      percentage: totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0,
    };
  });

  return NextResponse.json({
    pollId: poll.id,
    totalVotes,
    results,
  });
}
```

### `app/api/polls/[pollId]/public/route.ts`
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(_: Request, context: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await context.params;

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      event: true,
      options: { orderBy: { order: "asc" } },
      votes: true,
    },
  });

  if (!poll) {
    return NextResponse.json({ message: "Poll not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: poll.id,
    eventId: poll.eventId,
    eventSlug: poll.event.slug,
    title: poll.title,
    question: poll.question,
    type: poll.type.toLowerCase(),
    status: poll.status.toLowerCase(),
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      order: option.order,
      imageUrl: option.imageUrl,
    })),
    totalVotes: poll.votes.length,
    allowMultiple: false,
    showResultsLive: true,
  });
}
```

### `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum EventStatus {
  DRAFT
  PUBLISHED
  LIVE
  PAUSED
  ENDED
  ARCHIVED
}

enum PollStatus {
  DRAFT
  SCHEDULED
  ACTIVE
  CLOSED
  ARCHIVED
}

enum PollType {
  SINGLE_CHOICE
  MULTIPLE_CHOICE
  YES_NO
  RATING
  RANKING
  OPEN_TEXT
  WORD_CLOUD
  QUIZ
}

enum LiveState {
  WAITING
  VOTING
  RESULTS
  PAUSED
  FINISHED
}

model Event {
  id           String      @id @default(cuid())
  title        String
  slug         String      @unique
  status       EventStatus @default(DRAFT)
  liveState    LiveState   @default(WAITING)
  activePollId String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  polls        Poll[]
}

model Poll {
  id          String      @id @default(cuid())
  eventId     String
  title       String
  question    String
  type        PollType
  status      PollStatus  @default(DRAFT)
  order       Int         @default(0)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  event       Event       @relation(fields: [eventId], references: [id])
  options     PollOption[]
  votes       Vote[]
}

model PollOption {
  id          String   @id @default(cuid())
  pollId      String
  label       String
  order       Int      @default(0)
  imageUrl    String?

  poll        Poll     @relation(fields: [pollId], references: [id])
  votes       Vote[]
}

model Vote {
  id             String   @id @default(cuid())
  pollId         String
  optionId       String
  voterSessionId String
  createdAt      DateTime @default(now())

  poll           Poll     @relation(fields: [pollId], references: [id])
  option         PollOption @relation(fields: [optionId], references: [id])

  @@index([pollId])
  @@index([optionId])
}
```

---

## 3. Point important à corriger dès le départ

Pour ton cas d’usage, il vaut mieux ajouter ensuite une vraie logique de session votant stable, sinon `crypto.randomUUID()` recrée un nouvel identifiant à chaque clic.

Il faudra donc très vite ajouter un fichier comme :

### `lib/votes/voter-session.ts`
```ts
const KEY = "avote:voter-session-id";

export function getOrCreateVoterSessionId() {
  if (typeof window === "undefined") return "";

  const existing = localStorage.getItem(KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem(KEY, id);
  return id;
}
```

Et remplacer dans `PublicPollView.tsx` le `crypto.randomUUID()` direct par `getOrCreateVoterSessionId()`.

---

## 4. Ordre de développement recommandé

1. `schema.prisma`
2. `lib/db/prisma.ts`
3. `types/*`
4. `server/services/poll.service.ts`
5. `server/services/vote.service.ts`
6. `app/api/polls/[pollId]/public/route.ts`
7. `app/api/polls/[pollId]/vote/route.ts`
8. `app/api/polls/[pollId]/results/route.ts`
9. `lib/votes/local-vote-storage.ts`
10. `hooks/useLocalVoteState.ts`
11. `hooks/useVote.ts`
12. `components/voting/*`
13. `app/p/[slug]/page.tsx`
14. `components/live/*`
15. `app/(dashboard)/evenements/[eventId]/live/page.tsx`
16. `app/live/[eventSlug]/page.tsx`

---

## 5. Suite logique

Ensuite, tu pourras ajouter :
- vrai realtime
- QR code
- changement automatique de sondage
- affichage live des résultats
- dashboard complet
- Stripe
- modération

---

## 6. V3 prête à coder — base exploitable

### `lib/votes/voter-session.ts`
```ts
const KEY = "avote:voter-session-id";

export function getOrCreateVoterSessionId() {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(KEY, id);
  return id;
}
```

### `server/services/poll.service.ts`
```ts
import { prisma } from "@/lib/db/prisma";
import type { PollResultsDto, PublicPollDto } from "@/types/poll";

function mapType(type: string): PublicPollDto["type"] {
  return type.toLowerCase() as PublicPollDto["type"];
}

function mapStatus(status: string): PublicPollDto["status"] {
  return status.toLowerCase() as PublicPollDto["status"];
}

export async function getPublicPollByEventSlug(slug: string): Promise<PublicPollDto | null> {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      polls: {
        where: { status: "ACTIVE" },
        include: {
          options: { orderBy: { order: "asc" } },
          votes: true,
        },
        orderBy: { order: "asc" },
        take: 1,
      },
    },
  });

  const poll = event?.polls[0];
  if (!event || !poll) return null;

  return {
    id: poll.id,
    eventId: event.id,
    eventSlug: event.slug,
    title: poll.title,
    question: poll.question,
    type: mapType(poll.type),
    status: mapStatus(poll.status),
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      order: option.order,
      imageUrl: option.imageUrl,
    })),
    totalVotes: poll.votes.length,
    allowMultiple: poll.type === "MULTIPLE_CHOICE",
    showResultsLive: true,
  };
}

export async function getPublicPollById(pollId: string): Promise<PublicPollDto | null> {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      event: true,
      options: { orderBy: { order: "asc" } },
      votes: true,
    },
  });

  if (!poll) return null;

  return {
    id: poll.id,
    eventId: poll.eventId,
    eventSlug: poll.event.slug,
    title: poll.title,
    question: poll.question,
    type: mapType(poll.type),
    status: mapStatus(poll.status),
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      order: option.order,
      imageUrl: option.imageUrl,
    })),
    totalVotes: poll.votes.length,
    allowMultiple: poll.type === "MULTIPLE_CHOICE",
    showResultsLive: true,
  };
}

export async function getPollResults(pollId: string): Promise<PollResultsDto | null> {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: { orderBy: { order: "asc" } },
      votes: true,
    },
  });

  if (!poll) return null;

  const totalVotes = poll.votes.length;

  return {
    pollId: poll.id,
    totalVotes,
    results: poll.options.map((option) => {
      const votes = poll.votes.filter((vote) => vote.optionId === option.id).length;
      return {
        optionId: option.id,
        label: option.label,
        votes,
        percentage: totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0,
      };
    }),
  };
}

export async function getLiveEventView(eventSlug: string) {
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    include: {
      polls: {
        where: { id: undefined },
      },
    },
  });

  if (!event) return null;

  const activePoll = event.activePollId ? await getPublicPollById(event.activePollId) : null;
  const results = event.activePollId ? await getPollResults(event.activePollId) : null;

  return {
    eventId: event.id,
    eventSlug: event.slug,
    title: event.title,
    liveState: event.liveState.toLowerCase(),
    activePoll,
    results,
  };
}
```

### `server/services/vote.service.ts`
```ts
import { prisma } from "@/lib/db/prisma";
import type { VoteResponse } from "@/types/vote";

type SubmitVoteInput = {
  pollId: string;
  optionIds: string[];
  voterSessionId: string;
};

export async function submitVote(input: SubmitVoteInput): Promise<VoteResponse> {
  const poll = await prisma.poll.findUnique({
    where: { id: input.pollId },
    include: {
      options: true,
      votes: true,
    },
  });

  if (!poll) {
    return {
      ok: false,
      alreadyVoted: false,
      message: "Sondage introuvable.",
    };
  }

  if (poll.status !== "ACTIVE") {
    return {
      ok: false,
      alreadyVoted: false,
      message: "Ce sondage n'est pas ouvert au vote.",
    };
  }

  const existingVote = await prisma.vote.findFirst({
    where: {
      pollId: input.pollId,
      voterSessionId: input.voterSessionId,
    },
  });

  if (existingVote) {
    return {
      ok: false,
      alreadyVoted: true,
      message: "Vous avez déjà voté pour ce sondage.",
    };
  }

  const allowedOptionIds = new Set(poll.options.map((option) => option.id));
  const cleanedOptionIds = [...new Set(input.optionIds)].filter((id) => allowedOptionIds.has(id));

  if (cleanedOptionIds.length === 0) {
    return {
      ok: false,
      alreadyVoted: false,
      message: "Aucune réponse valide sélectionnée.",
    };
  }

  if (poll.type !== "MULTIPLE_CHOICE" && cleanedOptionIds.length > 1) {
    return {
      ok: false,
      alreadyVoted: false,
      message: "Une seule réponse est autorisée pour ce sondage.",
    };
  }

  await prisma.vote.createMany({
    data: cleanedOptionIds.map((optionId) => ({
      pollId: input.pollId,
      optionId,
      voterSessionId: input.voterSessionId,
    })),
  });

  return {
    ok: true,
    alreadyVoted: false,
  };
}
```

### `server/services/live.service.ts`
```ts
import { prisma } from "@/lib/db/prisma";

export async function setEventLiveState(eventId: string, liveState: "WAITING" | "VOTING" | "RESULTS" | "PAUSED" | "FINISHED") {
  return prisma.event.update({
    where: { id: eventId },
    data: { liveState },
  });
}

export async function showResults(eventId: string) {
  return prisma.event.update({
    where: { id: eventId },
    data: { liveState: "RESULTS" },
  });
}

export async function goToVoting(eventId: string) {
  return prisma.event.update({
    where: { id: eventId },
    data: { liveState: "VOTING" },
  });
}

export async function goToNextPoll(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      polls: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const orderedPolls = event.polls.filter((poll) => poll.status !== "ARCHIVED");
  const currentIndex = orderedPolls.findIndex((poll) => poll.id === event.activePollId);
  const nextPoll = currentIndex >= 0 ? orderedPolls[currentIndex + 1] : orderedPolls[0];

  if (!nextPoll) {
    return prisma.event.update({
      where: { id: eventId },
      data: { liveState: "FINISHED" },
    });
  }

  await prisma.poll.updateMany({
    where: { eventId, status: "ACTIVE" },
    data: { status: "CLOSED" },
  });

  await prisma.poll.update({
    where: { id: nextPoll.id },
    data: { status: "ACTIVE" },
  });

  return prisma.event.update({
    where: { id: eventId },
    data: {
      activePollId: nextPoll.id,
      liveState: "VOTING",
    },
  });
}
```

### `app/api/p/[slug]/route.ts`
```ts
import { NextResponse } from "next/server";
import { getPublicPollByEventSlug } from "@/server/services/poll.service";

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const poll = await getPublicPollByEventSlug(slug);

  if (!poll) {
    return NextResponse.json({ message: "Aucun sondage actif." }, { status: 404 });
  }

  return NextResponse.json(poll);
}
```

### `app/api/polls/[pollId]/public/route.ts`
```ts
import { NextResponse } from "next/server";
import { getPublicPollById } from "@/server/services/poll.service";

export async function GET(_: Request, context: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await context.params;
  const poll = await getPublicPollById(pollId);

  if (!poll) {
    return NextResponse.json({ message: "Poll not found" }, { status: 404 });
  }

  return NextResponse.json(poll);
}
```

### `app/api/polls/[pollId]/vote/route.ts`
```ts
import { NextResponse } from "next/server";
import { submitVote } from "@/server/services/vote.service";

export async function POST(request: Request, context: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await context.params;
  const body = (await request.json()) as {
    optionIds: string[];
    voterSessionId: string;
  };

  const result = await submitVote({
    pollId,
    optionIds: body.optionIds,
    voterSessionId: body.voterSessionId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : result.alreadyVoted ? 409 : 400 });
}
```

### `app/api/polls/[pollId]/results/route.ts`
```ts
import { NextResponse } from "next/server";
import { getPollResults } from "@/server/services/poll.service";

export async function GET(_: Request, context: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await context.params;
  const results = await getPollResults(pollId);

  if (!results) {
    return NextResponse.json({ message: "Poll not found" }, { status: 404 });
  }

  return NextResponse.json(results);
}
```

### `app/api/live/[eventId]/state/route.ts`
```ts
import { NextResponse } from "next/server";
import { goToVoting } from "@/server/services/live.service";

export async function POST(_: Request, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  const updated = await goToVoting(eventId);
  return NextResponse.json(updated);
}
```

### `app/api/live/[eventId]/show-results/route.ts`
```ts
import { NextResponse } from "next/server";
import { showResults } from "@/server/services/live.service";

export async function POST(_: Request, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  const updated = await showResults(eventId);
  return NextResponse.json(updated);
}
```

### `app/api/live/[eventId]/next-poll/route.ts`
```ts
import { NextResponse } from "next/server";
import { goToNextPoll } from "@/server/services/live.service";

export async function POST(_: Request, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  const updated = await goToNextPoll(eventId);
  return NextResponse.json(updated);
}
```

### `hooks/useVote.ts`
```ts
"use client";

import { flushSync } from "react-dom";
import { useEffect, useState } from "react";
import { setStoredVote } from "@/lib/votes/local-vote-storage";
import { getOrCreateVoterSessionId } from "@/lib/votes/voter-session";
import type { VoteResponse } from "@/types/vote";

type UseVoteParams = {
  pollId: string | null;
  onAfterSuccessReload: () => Promise<void>;
};

export function useVote({ pollId, onAfterSuccessReload }: UseVoteParams) {
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [merciPourVote, setMerciPourVote] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMerciPourVote(false);
    setErrorMessage(null);
  }, [pollId]);

  async function submitVote(optionIds: string[]) {
    if (!pollId) return { ok: false };

    setErrorMessage(null);
    setIsSubmittingVote(true);

    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionIds,
          voterSessionId: getOrCreateVoterSessionId(),
        }),
      });

      const data = (await res.json()) as VoteResponse;

      if (!res.ok || !data.ok) {
        setErrorMessage(data.message ?? "Impossible d'enregistrer le vote.");
        return { ok: false };
      }

      setStoredVote(pollId);
      await onAfterSuccessReload();

      flushSync(() => {
        setMerciPourVote(true);
      });

      return { ok: true };
    } catch {
      setErrorMessage("Une erreur est survenue pendant le vote.");
      return { ok: false };
    } finally {
      setIsSubmittingVote(false);
    }
  }

  return {
    isSubmittingVote,
    merciPourVote,
    setMerciPourVote,
    errorMessage,
    submitVote,
  };
}
```

### `components/voting/PublicPollView.tsx`
```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { AlreadyVotedBanner } from "@/components/voting/AlreadyVotedBanner";
import { PollOptionButton } from "@/components/voting/PollOptionButton";
import { VoteConfirmationBanner } from "@/components/voting/VoteConfirmationBanner";
import { useLocalVoteState } from "@/hooks/useLocalVoteState";
import { useVote } from "@/hooks/useVote";
import type { PublicPollDto } from "@/types/poll";

type Props = {
  slug: string;
};

export function PublicPollView({ slug }: Props) {
  const [poll, setPoll] = useState<PublicPollDto | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function loadPoll() {
    setIsLoading(true);
    setNotFound(false);

    const res = await fetch(`/api/p/${slug}`, { cache: "no-store" });

    if (!res.ok) {
      setPoll(null);
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    const data = (await res.json()) as PublicPollDto;
    setPoll(data);
    setSelectedOptionIds([]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadPoll();
  }, [slug]);

  const pollId = poll?.id ?? null;
  const { aDejaVoteEnStockage } = useLocalVoteState(pollId);
  const { isSubmittingVote, merciPourVote, errorMessage, submitVote } = useVote({
    pollId,
    onAfterSuccessReload: loadPoll,
  });

  const isDisabled = useMemo(() => {
    return isSubmittingVote || merciPourVote || aDejaVoteEnStockage;
  }, [isSubmittingVote, merciPourVote, aDejaVoteEnStockage]);

  function toggleOption(optionId: string) {
    if (!poll || isDisabled) return;

    if (!poll.allowMultiple) {
      setSelectedOptionIds([optionId]);
      return;
    }

    setSelectedOptionIds((current) =>
      current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId],
    );
  }

  if (isLoading) return <div className="mx-auto max-w-xl p-4">Chargement…</div>;
  if (notFound || !poll) return <div className="mx-auto max-w-xl p-4">Aucun sondage actif pour le moment.</div>;

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      {merciPourVote ? <VoteConfirmationBanner /> : null}
      {!merciPourVote && aDejaVoteEnStockage ? <AlreadyVotedBanner /> : null}
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{poll.title}</h1>
        <p className="text-base text-neutral-700">{poll.question}</p>
      </div>

      <div className="space-y-3">
        {poll.options.map((option) => (
          <PollOptionButton
            key={option.id}
            option={option}
            selected={selectedOptionIds.includes(option.id)}
            disabled={isDisabled}
            onClick={() => toggleOption(option.id)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={selectedOptionIds.length === 0 || isDisabled}
        className="w-full rounded-2xl bg-black px-4 py-4 text-white disabled:opacity-50"
        onClick={async () => {
          await submitVote(selectedOptionIds);
        }}
      >
        Voter
      </button>

      <div className="text-sm text-neutral-500">{poll.totalVotes} vote(s)</div>
    </div>
  );
}
```

### `app/live/[eventSlug]/page.tsx`
```tsx
import { LiveResultsScreen } from "@/components/live/LiveResultsScreen";
import { LiveVotingScreen } from "@/components/live/LiveVotingScreen";
import { getLiveEventView } from "@/server/services/poll.service";

export default async function LiveEventPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const data = await getLiveEventView(eventSlug);

  if (!data) {
    return <div className="p-8">Événement introuvable.</div>;
  }

  if (data.liveState === "results" && data.results) {
    return <LiveResultsScreen results={data.results} />;
  }

  if (data.activePoll) {
    return <LiveVotingScreen poll={data.activePoll} />;
  }

  return <div className="p-8">En attente du prochain sondage.</div>;
}
```

### `components/live/LiveControlPanel.tsx`
```tsx
"use client";

import { useState } from "react";

type Props = {
  eventId: string;
};

export function LiveControlPanel({ eventId }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function call(path: string) {
    try {
      setIsLoading(true);
      await fetch(path, { method: "POST" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        className="rounded-xl border px-4 py-2 disabled:opacity-50"
        disabled={isLoading}
        onClick={() => call(`/api/live/${eventId}/state`)}
      >
        Mettre en vote
      </button>
      <button
        className="rounded-xl border px-4 py-2 disabled:opacity-50"
        disabled={isLoading}
        onClick={() => call(`/api/live/${eventId}/show-results`)}
      >
        Afficher résultats
      </button>
      <button
        className="rounded-xl border px-4 py-2 disabled:opacity-50"
        disabled={isLoading}
        onClick={() => call(`/api/live/${eventId}/next-poll`)}
      >
        Sondage suivant
      </button>
    </div>
  );
}
```

### `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum EventStatus {
  DRAFT
  PUBLISHED
  LIVE
  PAUSED
  ENDED
  ARCHIVED
}

enum PollStatus {
  DRAFT
  SCHEDULED
  ACTIVE
  CLOSED
  ARCHIVED
}

enum PollType {
  SINGLE_CHOICE
  MULTIPLE_CHOICE
  YES_NO
  RATING
  RANKING
  OPEN_TEXT
  WORD_CLOUD
  QUIZ
}

enum LiveState {
  WAITING
  VOTING
  RESULTS
  PAUSED
  FINISHED
}

model Event {
  id           String      @id @default(cuid())
  title        String
  slug         String      @unique
  status       EventStatus @default(DRAFT)
  liveState    LiveState   @default(WAITING)
  activePollId String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  polls        Poll[]
}

model Poll {
  id          String      @id @default(cuid())
  eventId     String
  title       String
  question    String
  type        PollType
  status      PollStatus  @default(DRAFT)
  order       Int         @default(0)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  event       Event       @relation(fields: [eventId], references: [id])
  options     PollOption[]
  votes       Vote[]
}

model PollOption {
  id          String   @id @default(cuid())
  pollId      String
  label       String
  order       Int      @default(0)
  imageUrl    String?

  poll        Poll     @relation(fields: [pollId], references: [id])
  votes       Vote[]
}

model Vote {
  id             String   @id @default(cuid())
  pollId         String
  optionId       String
  voterSessionId String
  createdAt      DateTime @default(now())

  poll           Poll       @relation(fields: [pollId], references: [id])
  option         PollOption @relation(fields: [optionId], references: [id])

  @@index([pollId])
  @@index([optionId])
  @@index([pollId, voterSessionId])
}
```

---

## 7. Corrections importantes à faire tout de suite

### A. Route publique
Dans la V2, `PublicPollView` appelait `/api/polls/${slug}/public` alors que `slug` est un slug d’événement, pas un `pollId`.

La bonne version est maintenant :
- `PublicPollView` → `/api/p/${slug}`
- `/api/p/[slug]` → retourne le sondage actif de l’événement

### B. Session votant stable
Ne jamais recréer un `crypto.randomUUID()` à chaque vote.

La bonne version est maintenant :
- `getOrCreateVoterSessionId()`
- stockage persistant localStorage

### C. Anti double vote
Le vrai blocage serveur repose sur :
- vérification `pollId + voterSessionId`
- plus `localStorage` côté UX

### D. Poll actif
Le public ne doit pas demander un poll précis si ton entrée publique principale est l’événement.

Le slug public doit pointer vers :
- l’événement
- puis le sondage actif de cet événement

---

## 8. Prompt Cursor conseillé

```text
Contexte :
Je développe Avote.app en Next.js App Router + TypeScript + Prisma + PostgreSQL.
Je veux mettre en place la base fonctionnelle MVP du vote public + live admin.

Ta mission :
1. Créer les fichiers manquants si nécessaire.
2. Remplacer le contenu des fichiers existants par les versions fournies.
3. Vérifier tous les imports.
4. Corriger les types si Prisma génère des enums en majuscules.
5. Ne pas ajouter de librairie inutile.
6. Garder un code propre, simple et compilable.

Objectif fonctionnel :
- page publique `/p/[slug]` = récupère le sondage actif d’un événement
- vote avec anti double vote UX + serveur
- message vert juste après vote réussi
- message bleu au rechargement si déjà voté
- page live admin pour piloter
- page live publique qui affiche soit la question soit les résultats

Vérifie aussi :
- que `merciPourVote` est reset quand le poll change
- que `aDejaVoteEnStockage` est relu quand le poll change
- que les boutons sont désactivés si vote en cours, merciPourVote, ou déjà voté
- que la route `/api/p/[slug]` existe bien
- que le service serveur retourne bien le poll actif
```

---

## 9. Prochaine étape recommandée

Après cette V3, fais immédiatement :
1. seed Prisma avec 1 event + 2 polls + options
2. page admin liste des polls de l’événement
3. vraie bascule de poll actif depuis le live admin
4. polling simple côté écran public toutes les 2 secondes
5. ensuite seulement realtime websocket / pusher / ably
```

