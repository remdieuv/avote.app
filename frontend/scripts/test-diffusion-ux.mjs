/**
 * LOT-2 — Diffusion Screen / Overlay (P8 + guide OBS micro-copy).
 * Exécution : node frontend/scripts/test-diffusion-ux.mjs
 */
import assert from "node:assert/strict";
import {
  DIFFUSION_SCREEN_VS_OVERLAY_HINT,
  OBS_GUIDE_STEPS,
  overlayMustStayTransparent,
  shouldShowScreenCornerQr,
} from "../lib/diffusionUx.js";

/** @type {{ name: string; input: Parameters<typeof shouldShowScreenCornerQr>[0]; expect: boolean }[]} */
const screenQrCases = [
  {
    name: "A. attente valide → QR coin OK",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "waiting",
      displayState: "waiting",
      surface: "other",
      projectionMode: "standard",
    },
    expect: true,
  },
  {
    name: "B. question ouverte → QR coin masqué (QR dans ScreenQuestion)",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "voting",
      displayState: "question",
      surface: "question",
      projectionMode: "standard",
    },
    expect: false,
  },
  {
    name: "C. CLOSED / attente révélation → QR coin OK",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "waiting",
      displayState: "waiting",
      surface: "other",
      projectionMode: "standard",
    },
    expect: true,
  },
  {
    name: "D. RESULTS → QR coin compact OK",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "results",
      displayState: "results",
      surface: "results",
      projectionMode: "standard",
    },
    expect: true,
  },
  {
    name: "Dbis. RESULTS focus → pas de QR coin",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "results",
      displayState: "results",
      surface: "results",
      projectionMode: "results_focus",
    },
    expect: false,
  },
  {
    name: "E. FINISHED → pas de QR",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "finished",
      displayState: "waiting",
      surface: "other",
      projectionMode: "standard",
    },
    expect: false,
  },
  {
    name: "F. événement invalide → pas de QR (P8)",
    input: {
      loading: false,
      error: "Ce lien ne correspond à aucun événement.",
      eventInvalid: true,
      liveScene: null,
      displayState: null,
      surface: "other",
      projectionMode: "standard",
    },
    expect: false,
  },
  {
    name: "G. absence de données / loading → pas de QR",
    input: {
      loading: true,
      error: null,
      eventInvalid: false,
      liveScene: null,
      displayState: null,
      surface: "other",
      projectionMode: "standard",
    },
    expect: false,
  },
  {
    name: "H. erreur API (sans invalid flag) → pas de QR",
    input: {
      loading: false,
      error: "Impossible de joindre l’API (port 4000 ?).",
      eventInvalid: false,
      liveScene: "waiting",
      displayState: "waiting",
      surface: "other",
      projectionMode: "standard",
    },
    expect: false,
  },
  {
    name: "I. pause / black → pas de QR",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "paused",
      displayState: "black",
      surface: "other",
      projectionMode: "standard",
    },
    expect: false,
  },
];

/** @type {{ name: string; input: Parameters<typeof overlayMustStayTransparent>[0]; expect: boolean }[]} */
const overlayCases = [
  {
    name: "J. attente / idle (no poll) → transparent",
    input: { noPollIdle: true, effectivePanel: "empty" },
    expect: true,
  },
  {
    name: "K. question panel → pas forcé transparent",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      noPollIdle: false,
      effectivePanel: "question",
      displayState: "question",
    },
    expect: false,
  },
  {
    name: "L. résultats → pas forcé transparent",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      noPollIdle: false,
      effectivePanel: "results",
      displayState: "results",
    },
    expect: false,
  },
  {
    name: "M. empty / finished idle → transparent",
    input: { effectivePanel: "empty", displayState: "waiting" },
    expect: true,
  },
  {
    name: "N. événement invalide → transparent (P8, pas de glass blanc)",
    input: {
      eventInvalid: true,
      error: "Ce lien ne correspond à aucun événement.",
      effectivePanel: "question",
    },
    expect: true,
  },
  {
    name: "O. absence de données / loading → transparent",
    input: { loading: true },
    expect: true,
  },
  {
    name: "P. blackout → transparent",
    input: { displayState: "black", effectivePanel: "empty" },
    expect: true,
  },
  {
    name: "Q. erreur générique → transparent (aucun fallback blanc opaque)",
    input: { error: "Impossible de joindre l’API." },
    expect: true,
  },
];

let failed = 0;

for (const c of screenQrCases) {
  const got = shouldShowScreenCornerQr(c.input);
  try {
    assert.equal(got, c.expect, c.name);
    console.log(`ok  SCREEN ${c.name} → ${got}`);
  } catch {
    failed += 1;
    console.error(`FAIL SCREEN ${c.name}: got ${got}, expected ${c.expect}`);
  }
}

for (const c of overlayCases) {
  const got = overlayMustStayTransparent(c.input);
  try {
    assert.equal(got, c.expect, c.name);
    console.log(`ok  OVERLAY ${c.name} → ${got}`);
  } catch {
    failed += 1;
    console.error(`FAIL OVERLAY ${c.name}: got ${got}, expected ${c.expect}`);
  }
}

assert.ok(
  /salle|TV/i.test(DIFFUSION_SCREEN_VS_OVERLAY_HINT) &&
    /OBS/i.test(DIFFUSION_SCREEN_VS_OVERLAY_HINT),
  "hint Screen vs Overlay",
);
assert.equal(OBS_GUIDE_STEPS.length, 3, "guide OBS 3 gestes");
assert.ok(/Overlay|URL/i.test(OBS_GUIDE_STEPS[0]));
assert.ok(/OBS|Navigateur/i.test(OBS_GUIDE_STEPS[1]));
assert.ok(/transparence|blanc/i.test(OBS_GUIDE_STEPS[2]));
console.log("ok  guide OBS 3 gestes + hint Screen≠Overlay");

if (failed > 0) {
  console.error(`\n${failed} cas en échec`);
  process.exit(1);
}
console.log(
  `\n${screenQrCases.length + overlayCases.length + 1} assertions OK — LOT-2 diffusion`,
);
