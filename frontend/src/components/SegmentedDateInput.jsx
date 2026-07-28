import { useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

/* Three plain number segments instead of the native <input type="date"> picker. The
   native control's auto-advance and validity styling differ across browsers and can
   flash "invalid" mid-type even when the missing part (e.g. the year) was already
   filled in programmatically — this sidesteps that entirely.

   Emits "" while incomplete, so an existing required-field check ("form[key] !== ''")
   keeps working unchanged, and "YYYY-MM-DD" once all three segments are filled. */
export function SegmentedDateInput({ value, onChange, testId }) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const dayRef = useRef(null);
  const monthRef = useRef(null);
  const yearRef = useRef(null);

  // Only adopt a fully-formed external value (e.g. a restored draft) — our own
  // emissions while the user is still typing are "" and must not erase their input.
  useEffect(() => {
    if (!value) return;
    const [y, m, d] = value.split("-");
    if (y?.length === 4 && m?.length === 2 && d?.length === 2) {
      setYear(y); setMonth(m); setDay(d);
    }
  }, [value]);

  const digits = (raw, max) => raw.replace(/\D/g, "").slice(0, max);
  const emit = (d, m, y) => onChange(d.length === 2 && m.length === 2 && y.length === 4 ? `${y}-${m}-${d}` : "");

  const onDay = (e) => {
    const v = digits(e.target.value, 2);
    setDay(v); emit(v, month, year);
    if (v.length === 2) monthRef.current?.focus();
  };
  const onMonth = (e) => {
    const v = digits(e.target.value, 2);
    setMonth(v); emit(day, v, year);
    if (v.length === 2) yearRef.current?.focus();
  };
  const onYear = (e) => {
    const v = digits(e.target.value, 4);
    setYear(v); emit(day, month, v);
  };
  const backTo = (ref) => (e) => {
    if (e.key === "Backspace" && !e.target.value && ref?.current) {
      e.preventDefault(); ref.current.focus();
    }
  };

  return (
    <div className="flex items-center gap-1.5" data-testid={testId}>
      <Input ref={dayRef} value={day} onChange={onDay} placeholder="TT" inputMode="numeric"
        maxLength={2} className="w-14 text-center tabular-nums" aria-label="Tag" />
      <span className="text-muted-foreground">.</span>
      <Input ref={monthRef} value={month} onChange={onMonth} placeholder="MM" inputMode="numeric"
        maxLength={2} className="w-14 text-center tabular-nums" aria-label="Monat" onKeyDown={backTo(dayRef)} />
      <span className="text-muted-foreground">.</span>
      <Input ref={yearRef} value={year} onChange={onYear} placeholder="JJJJ" inputMode="numeric"
        maxLength={4} className="w-20 text-center tabular-nums" aria-label="Jahr" onKeyDown={backTo(monthRef)} />
    </div>
  );
}
