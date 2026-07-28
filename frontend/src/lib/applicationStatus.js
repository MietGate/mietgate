/* Shared between the pipeline board and the inbox quick actions, so a status change means
   the same thing — and asks the same questions — wherever it is triggered. */

export const STATUS_COLUMNS = [
  { key: "neu", label: "Neu", dot: "bg-slate-400" },
  { key: "pruefung", label: "Prüfung", dot: "bg-blue-500" },
  { key: "interessant", label: "Interessant", dot: "bg-violet-500" },
  { key: "besichtigung", label: "Besichtigung", dot: "bg-primary" },
  { key: "favorit", label: "Favorit", dot: "bg-amber-500" },
  { key: "zusage", label: "Zusage", dot: "bg-success" },
  { key: "absage", label: "Absage", dot: "bg-destructive" },
  { key: "archiv", label: "Archiv", dot: "bg-muted-foreground" },
];

export const ACTIVE_COLUMNS = STATUS_COLUMNS.filter((c) => c.key !== "archiv");

/* Applicants still in the running — the ones a "someone else got it" mail would reach. */
export const ACTIVE_STAGES = ["neu", "pruefung", "interessant", "besichtigung", "favorit"];

/* Every path that changes a status must ask before anything leaves the building.
   Returns the extra request options, or null when the landlord backed out. */
export function confirmStatusChange(newStatus, otherActiveCount) {
  if (newStatus === "absage") {
    return window.confirm("Status auf „Absage\" setzen? Der Bewerber erhält dadurch sofort eine Absage-E-Mail.")
      ? { reject_others: false } : null;
  }
  if (newStatus === "zusage") {
    if (!window.confirm("Zusage erteilen? Der Bewerber erhält sofort eine Zusage-E-Mail.")) return null;
    const rejectOthers = otherActiveCount > 0 && window.confirm(
      `Sollen die übrigen ${otherActiveCount} Bewerber jetzt eine freundliche Absage erhalten?\n\n` +
      `Sie werden auf „Absage\" gesetzt und erhalten eine E-Mail. Das lässt sich nicht rückgängig machen.\n\n` +
      `Abbrechen: Zusage wird trotzdem erteilt, die anderen bleiben unverändert.`);
    return { reject_others: rejectOthers };
  }
  return { reject_others: false };
}
