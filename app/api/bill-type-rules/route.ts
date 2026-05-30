import { NextResponse } from "next/server";
import { getBillTypeRules } from "@/lib/sheets";

export async function GET() {
  try {
    const rules = await getBillTypeRules();
    return NextResponse.json(rules);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
