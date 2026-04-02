const CLE_SESSION = "avote:voter-session-id";

/** @returns {string} */
export function getOrCreateVoterSessionId() {
  if (typeof window === "undefined") return "";

  const existant = window.localStorage.getItem(CLE_SESSION);
  if (existant) return existant;

  const id = crypto.randomUUID();
  window.localStorage.setItem(CLE_SESSION, id);
  return id;
}
