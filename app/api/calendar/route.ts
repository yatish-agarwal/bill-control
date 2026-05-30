import { NextResponse } from "next/server";
import { getCalendar, appendCalendarRow } from "@/lib/sheets";

export async function GET() {
  try {
    const data = await getCalendar();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const missing = (["vendor", "site", "billType"] as const).filter(
      (k) => !String(body[k] ?? "").trim()
    );
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required field(s): ${missing.join(", ")}` },
        { status: 400 }
      );
    }
    await appendCalendarRow({
      vendor: String(body.vendor).trim(),
      site: String(body.site).trim(),
      billType: String(body.billType).trim(),
      frequency: String(body.frequency ?? "Monthly").trim(),
      agreedAmount: String(body.agreedAmount ?? "").trim(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
