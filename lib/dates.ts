// Today's date as YYYY-MM-DD in India time (Asia/Kolkata).
// The company operates only in India; browsers/servers in other zones (or UTC,
// like Vercel) must not stamp the wrong calendar day. Use this everywhere a
// "today" date is recorded or defaulted, instead of new Date().toISOString().
export function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
