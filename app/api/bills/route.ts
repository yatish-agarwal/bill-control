import { NextResponse } from "next/server";
import { getAllBills, appendBill } from "@/lib/sheets";
import { Bill } from "@/lib/types";

export async function GET() {
  try {
    const bills = await getAllBills();
    return NextResponse.json(bills);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data: Partial<Bill> = await req.json();
    const billId = await appendBill(data);
    return NextResponse.json({ billId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
