import { NextResponse } from "next/server";
import { updateCalendarCell } from "@/lib/sheets";

// Allowed cell statuses — keep in sync with the calendar page's cycle.
const ALLOWED = ["", "Expected", "Received", "Paid", "N/A"];

export async function PATCH(req: Request) {
  try {
    const { rowIndex, monthIndex, status } = await req.json();
    if (
      typeof rowIndex !== "number" ||
      typeof monthIndex !== "number" ||
      rowIndex < 3 ||
      monthIndex < 0
    ) {
      return NextResponse.json({ error: "Invalid cell reference" }, { status: 400 });
    }
    if (!ALLOWED.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }
    await updateCalendarCell(rowIndex, monthIndex, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
