"use client";

import { useEffect, useState } from "react";
import {
  frDateTimeToDatetimeLocal,
  splitDatetimeLocalFr,
} from "@/lib/frDateTime";

const labelStyle = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "#334155",
  marginBottom: "0.28rem",
};

const inputStyle = {
  width: "100%",
  minHeight: "38px",
  padding: "0.45rem 0.6rem",
  fontSize: "0.86rem",
  borderRadius: "9px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  background: "#fff",
  outline: "none",
};

/**
 * Saisie date/heure FR (jj/mm/aaaa + 24 h) → valeur `datetime-local` inchangée.
 *
 * @param {{
 *   id?: string;
 *   label?: string;
 *   value?: string;
 *   onChange?: (datetimeLocal: string) => void;
 *   disabled?: boolean;
 * }} props
 */
export function FrDatetimeLocalField({
  id = "fr-datetime",
  label = "Date et heure de début",
  value = "",
  onChange,
  disabled = false,
}) {
  const split = splitDatetimeLocalFr(value);
  const [dateFr, setDateFr] = useState(split?.dateFr || "");
  const [timeFr, setTimeFr] = useState(split?.timeFr || "");
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const next = splitDatetimeLocalFr(value);
    setDateFr(next?.dateFr || "");
    setTimeFr(next?.timeFr || "");
    setInvalid(false);
  }, [value]);

  function commit(nextDate, nextTime) {
    const local = frDateTimeToDatetimeLocal(nextDate, nextTime);
    if (local === null) {
      setInvalid(false);
      onChange?.("");
      return;
    }
    if (local === undefined) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange?.(local);
  }

  return (
    <div>
      <label style={labelStyle} htmlFor={`${id}-date`}>
        {label}
      </label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 0.85fr)",
          gap: "0.45rem",
        }}
      >
        <input
          id={`${id}-date`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="jj/mm/aaaa"
          lang="fr-FR"
          value={dateFr}
          disabled={disabled}
          aria-invalid={invalid ? "true" : undefined}
          onChange={(e) => {
            const v = e.target.value;
            setDateFr(v);
            commit(v, timeFr);
          }}
          style={{
            ...inputStyle,
            borderColor: invalid ? "#f87171" : inputStyle.border,
          }}
        />
        <input
          id={`${id}-time`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH:mm"
          lang="fr-FR"
          value={timeFr}
          disabled={disabled}
          aria-invalid={invalid ? "true" : undefined}
          aria-label="Heure (24 h)"
          onChange={(e) => {
            const v = e.target.value;
            setTimeFr(v);
            commit(dateFr, v);
          }}
          style={{
            ...inputStyle,
            borderColor: invalid ? "#f87171" : inputStyle.border,
          }}
        />
      </div>
      <p
        style={{
          margin: "0.28rem 0 0",
          fontSize: "0.72rem",
          color: invalid ? "#b91c1c" : "#64748b",
          lineHeight: 1.35,
        }}
      >
        {invalid
          ? "Indiquez une date jj/mm/aaaa et une heure HH:mm (24 h), ou laissez vide."
          : "Format français : jj/mm/aaaa et heure 24 h (ex. 15/12/2026 et 19:30)."}
      </p>
    </div>
  );
}
