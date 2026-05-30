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
    // Boundary validation — never write a junk row that consumes an ID.
    const missing = (["vendor", "vendorBillNo", "netAmount"] as const).filter(
      (k) => !String(data[k] ?? "").trim()
    );
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required field(s): ${missing.join(", ")}` },
        { status: 400 }
      );
    }
    const num = /^\d+(\.\d{1,2})?$/;
    const badAmount = (["billAmount", "gst", "tds", "netAmount"] as const).find((k) => {
      const v = String(data[k] ?? "").trim();
      return v !== "" && !num.test(v);
    });
    if (badAmount) {
      return NextResponse.json(
        { error: `Invalid numeric value for "${badAmount}"` },
        { status: 400 }
      );
    }
    const result = await appendBill(data);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
