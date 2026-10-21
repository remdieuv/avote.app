/**
 * L4 — CRM Mes leads : CSV colonnes/champ + détail réponses (D6 / D9 / O4).
 * Libs pures, sans React.
 */

import { canEditFormDefinitionField } from "./formTemplates.js";
import {
  answersToCsvColumns,
  resolveAnswersForDisplay,
} from "./formValidation.js";

/**
 * @param {unknown} type
 * @returns {"contest"|"lead"}
 */
export function leadSourceFromPollType(type) {
  return String(type || "").toUpperCase() === "CONTEST_ENTRY"
    ? "contest"
    : "lead";
}

/**
 * Prefixe colonne CSV multi-questions (O4).
 * @param {{ pollOrder?: number|null; pollQuestion?: string|null }} row
 */
export function csvColumnPrefixForLead(row) {
  const order =
    typeof row?.pollOrder === "number" && Number.isFinite(row.pollOrder)
      ? row.pollOrder + 1
      : null;
  if (order != null) return `Q${order} — `;
  const q = String(row?.pollQuestion || "").trim();
  if (q) return `${q.slice(0, 40)} — `;
  return "";
}

/**
 * Union ordonnée des clés de colonnes champs pour un export.
 * @param {Array<{
 *   formDefinition?: unknown;
 *   answers?: unknown;
 *   pollOrder?: number|null;
 *   pollQuestion?: string|null;
 *   pollId?: string|null;
 * }>} rows
 * @param {{ multiPoll?: boolean }} [opts]
 * @returns {string[]}
 */
export function collectLeadCsvFieldColumns(rows, opts = {}) {
  const pollIds = new Set(
    (rows || []).map((r) => r.pollId).filter((id) => id != null && id !== ""),
  );
  const multiPoll =
    opts.multiPoll != null ? Boolean(opts.multiPoll) : pollIds.size > 1;
  /** @type {string[]} */
  const ordered = [];
  const seen = new Set();
  for (const row of rows || []) {
    const prefix = multiPoll ? csvColumnPrefixForLead(row) : "";
    const cols = answersToCsvColumns(row.formDefinition, row.answers, {
      columnPrefix: prefix,
    });
    for (const key of Object.keys(cols)) {
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered;
}

/**
 * Construit un CSV leads (D6) : métadonnées + 1 colonne par champ (labels).
 * @param {Array<Record<string, unknown>>} rows
 * @param {{
 *   includeEventTitle?: boolean;
 *   separator?: string;
 *   bom?: boolean;
 * }} [opts]
 * @returns {string}
 */
export function buildLeadsCsv(rows, opts = {}) {
  const sep = opts.separator || ";";
  const includeEvent = opts.includeEventTitle !== false;
  const list = Array.isArray(rows) ? rows : [];
  const fieldCols = collectLeadCsvFieldColumns(list);
  const pollIds = new Set(
    list.map((r) => r.pollId).filter((id) => id != null && id !== ""),
  );
  const multiPoll = pollIds.size > 1;

  /** @type {string[]} */
  const header = ["Date", "Source", "Question"];
  if (includeEvent) header.splice(1, 0, "Événement");
  header.push("Prénom", "Nom", "Téléphone", "E-mail", ...fieldCols);

  const escape = (v) => {
    const s = String(v ?? "");
    if (s.includes(sep) || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [header.join(sep)];
  for (const r of list) {
    const prefix = multiPoll ? csvColumnPrefixForLead(r) : "";
    const fieldMap = answersToCsvColumns(r.formDefinition, r.answers, {
      columnPrefix: prefix,
    });
    const source =
      leadSourceFromPollType(r.pollType) === "contest" ? "Concours" : "Lead";
    const dateStr =
      r.createdAt != null
        ? new Date(/** @type {string|number|Date} */ (r.createdAt)).toLocaleString(
            "fr-FR",
          )
        : "";
    /** @type {unknown[]} */
    const cells = [
      dateStr,
      ...(includeEvent ? [r.eventTitle || ""] : []),
      source,
      r.pollQuestion ||
        (typeof r.pollOrder === "number"
          ? `Question ${r.pollOrder + 1}`
          : ""),
      r.firstName || "",
      r.lastName || "",
      r.phone || "",
      r.email || "",
      ...fieldCols.map((k) => fieldMap[k] ?? ""),
    ];
    lines.push(cells.map(escape).join(sep));
  }

  const body = lines.join("\n");
  return opts.bom === false ? body : `\ufeff${body}`;
}

/**
 * Lignes détail (labels lisibles). Préfère answersDisplay API si présent.
 * @param {{
 *   answersDisplay?: { label?: string; value?: string; fieldId?: string }[] | null;
 *   formDefinition?: unknown;
 *   answers?: unknown;
 *   firstName?: unknown;
 *   lastName?: unknown;
 *   phone?: unknown;
 *   email?: unknown;
 * }} lead
 * @returns {{ label: string; value: string; fieldId?: string }[]}
 */
export function leadDetailRows(lead) {
  if (Array.isArray(lead?.answersDisplay) && lead.answersDisplay.length > 0) {
    return lead.answersDisplay.map((row) => ({
      fieldId: row.fieldId,
      label: String(row.label || row.fieldId || "Champ"),
      value: String(row.value ?? ""),
    }));
  }
  const resolved = resolveAnswersForDisplay(lead?.formDefinition, lead?.answers);
  if (resolved.length > 0) {
    return resolved.map((row) => ({
      fieldId: row.fieldId,
      label: row.label,
      value: row.value,
    }));
  }
  // Fallback legacy sans answers JSON
  /** @type {{ label: string; value: string }[]} */
  const fallback = [];
  if (lead?.firstName != null && String(lead.firstName) !== "") {
    fallback.push({ label: "Prénom", value: String(lead.firstName) });
  }
  if (lead?.lastName != null && String(lead.lastName) !== "") {
    fallback.push({ label: "Nom", value: String(lead.lastName) });
  }
  if (lead?.phone != null && String(lead.phone) !== "") {
    fallback.push({ label: "Téléphone", value: String(lead.phone) });
  }
  if (lead?.email != null && String(lead.email) !== "") {
    fallback.push({ label: "E-mail", value: String(lead.email) });
  }
  return fallback;
}

/**
 * Soft lock helper builder (D4) — délègue à canEditFormDefinitionField.
 * @param {Parameters<typeof canEditFormDefinitionField>[0]} input
 */
export function assertFormFieldEditAllowed(input) {
  return canEditFormDefinitionField(input);
}

export { resolveAnswersForDisplay, answersToCsvColumns, canEditFormDefinitionField };
