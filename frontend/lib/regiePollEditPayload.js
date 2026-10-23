/**
 * Construction du payload PATCH « Modifier la question » (testable).
 */
import { validateQuestionFormBuilder } from "./forms/formBuilder.js";
import { regieFormPollKind } from "./forms/formUsage.js";
import { getRegiePollEditGuardState } from "./regiePollEditGuards.js";
import {
  pollTypeAllowsOptionEdit,
  validatePollOptionLabels,
} from "./pollOptionsForm.js";

/**
 * @param {{
 *   poll?: {
 *     id?: unknown;
 *     type?: unknown;
 *     leadEnabled?: unknown;
 *     voteCount?: unknown;
 *     quizRevealed?: unknown;
 *     options?: unknown;
 *   } | null;
 *   isLocked?: unknown;
 *   isLiveConsumed?: unknown;
 *   question?: unknown;
 *   optionLabels?: unknown;
 *   quizCorrectOrder?: unknown;
 *   leadTriggerOrder?: unknown;
 *   contestPrize?: unknown;
 *   contestWinnerCount?: unknown;
 *   formDefinition?: unknown;
 *   formTemplateKey?: unknown;
 *   normalizeContestWinnerCount?: (v: unknown) => number;
 * }} input
 * @returns {{
 *   ok: boolean;
 *   error: string | null;
 *   payload: Record<string, unknown> | null;
 *   guard: ReturnType<typeof getRegiePollEditGuardState>;
 * }}
 */
export function buildRegiePollEditPayload(input = {}) {
  const poll = input.poll || {};
  const isContest = String(poll.type || "").toUpperCase() === "CONTEST_ENTRY";
  const isQuiz = String(poll.type || "").toUpperCase() === "QUIZ";
  const formKind = regieFormPollKind(poll);
  const allowsOptionEdit = pollTypeAllowsOptionEdit(poll.type, {
    leadEnabled: poll.leadEnabled,
  });
  const guard = getRegiePollEditGuardState({
    isLocked: input.isLocked,
    isLiveConsumed: input.isLiveConsumed,
    voteCount: poll.voteCount,
    quizRevealed: poll.quizRevealed,
    isQuiz,
    allowsOptionEdit,
  });

  if (!guard.canEditSoftFields) {
    return {
      ok: false,
      error: guard.lockedReason || "Modification impossible pour cet événement.",
      payload: null,
      guard,
    };
  }

  const question = String(input.question || "").trim();
  if (!question) {
    return {
      ok: false,
      error: "Texte de question requis.",
      payload: null,
      guard,
    };
  }

  /** @type {Record<string, unknown>} */
  const payload = { question };

  if (isContest) {
    const norm =
      typeof input.normalizeContestWinnerCount === "function"
        ? input.normalizeContestWinnerCount
        : (v) => Math.max(1, Math.floor(Number(v) || 1));
    payload.contestPrize = String(input.contestPrize || "").trim() || null;
    payload.contestWinnerCount = norm(input.contestWinnerCount);
  }

  // L6 — parité create-event : PATCH formDefinition Lead/Concours (soft lock serveur).
  if (formKind && input.formDefinition != null) {
    const formCheck = validateQuestionFormBuilder({
      type: formKind,
      formDefinition: input.formDefinition,
      formTemplateKey:
        typeof input.formTemplateKey === "string"
          ? input.formTemplateKey
          : undefined,
    });
    if (!formCheck.ok) {
      return {
        ok: false,
        error: formCheck.error || "Formulaire invalide.",
        payload: null,
        guard,
      };
    }
    payload.formDefinition = input.formDefinition;
    payload.formTemplateKey =
      (typeof input.formTemplateKey === "string" &&
        input.formTemplateKey.trim()) ||
      (input.formDefinition &&
      typeof input.formDefinition === "object" &&
      typeof /** @type {{ templateKey?: unknown }} */ (input.formDefinition)
        .templateKey === "string"
        ? /** @type {{ templateKey: string }} */ (input.formDefinition)
            .templateKey
        : formKind === "CONTEST_ENTRY"
          ? "contest"
          : "contact");
  }

  if (guard.canEditOptions && allowsOptionEdit) {
    const draftRows = Array.isArray(input.optionLabels)
      ? input.optionLabels
      : [];
    // Refusoins les lignes vides silencieuses (sinon 4e réponse « disparait »).
    const emptyIdx = draftRows.findIndex(
      (row) => !String(row ?? "").trim(),
    );
    if (emptyIdx >= 0) {
      return {
        ok: false,
        error: `La réponse ${emptyIdx + 1} est vide. Saisissez un libellé ou retirez-la.`,
        payload: null,
        guard,
      };
    }
    const validated = validatePollOptionLabels(draftRows);
    if (!validated.ok) {
      return {
        ok: false,
        error: validated.error || "Réponses invalides.",
        payload: null,
        guard,
      };
    }
    if (validated.labels.length !== draftRows.length) {
      return {
        ok: false,
        error: "Chaque réponse doit avoir un libellé non vide.",
        payload: null,
        guard,
      };
    }
    payload.options = validated.labels;
    if (Boolean(poll.leadEnabled)) {
      payload.leadTriggerOrder = Math.max(
        0,
        Math.min(
          validated.labels.length - 1,
          Math.floor(Number(input.leadTriggerOrder) || 0),
        ),
      );
    }
    if (isQuiz) {
      const idx = Number(input.quizCorrectOrder);
      const max = validated.labels.length - 1;
      if (!Number.isFinite(idx) || idx < 0 || idx > max) {
        return {
          ok: false,
          error: "Sélectionnez la bonne réponse du quiz.",
          payload: null,
          guard,
        };
      }
      payload.quizCorrectOrder = idx;
    }
  } else if (isQuiz && guard.canEditQuizCorrect) {
    const quizOpts = Array.isArray(poll.options) ? poll.options : [];
    const max = Math.max(0, quizOpts.length - 1);
    const idx = Number(input.quizCorrectOrder);
    if (!Number.isFinite(idx) || idx < 0 || idx > max || quizOpts.length < 2) {
      return {
        ok: false,
        error: "Sélectionnez la bonne réponse du quiz.",
        payload: null,
        guard,
      };
    }
    payload.quizCorrectOrder = idx;
  }

  return { ok: true, error: null, payload, guard };
}

/**
 * Vérifie que la réponse PATCH a bien persisté les options envoyées.
 * @param {unknown} responseBody
 * @param {unknown} sentOptions
 * @returns {{ ok: boolean; error: string | null; labels: string[] }}
 */
export function assertPollEditOptionsPersisted(responseBody, sentOptions) {
  if (!Array.isArray(sentOptions)) {
    return { ok: true, error: null, labels: [] };
  }
  const expected = sentOptions.map((x) => String(x ?? "").trim());
  const rawOpts =
    responseBody &&
    typeof responseBody === "object" &&
    Array.isArray(/** @type {{ options?: unknown }} */ (responseBody).options)
      ? /** @type {{ options: Array<{ label?: unknown }> }} */ (responseBody)
          .options
      : null;
  if (!rawOpts) {
    return {
      ok: false,
      error: "Enregistrement incomplet : les réponses n’ont pas été renvoyées par le serveur.",
      labels: [],
    };
  }
  const got = rawOpts.map((o) => String(o?.label ?? "").trim());
  if (got.length !== expected.length) {
    return {
      ok: false,
      error: `Enregistrement incomplet : ${got.length} réponse(s) en base au lieu de ${expected.length}.`,
      labels: got,
    };
  }
  for (let i = 0; i < expected.length; i += 1) {
    if (got[i] !== expected[i]) {
      return {
        ok: false,
        error: `Enregistrement incomplet : la réponse ${i + 1} ne correspond pas.`,
        labels: got,
      };
    }
  }
  return { ok: true, error: null, labels: got };
}
