import { NextResponse } from "next/server";
import { runThreeWayMatch } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const invoice = formData.get("invoice") as File | null;
    const po = formData.get("po") as File | null;
    const grn = formData.get("grn") as File | null;

    if (!invoice || !po || !grn) {
      return NextResponse.json({ error: "invoice, po, and grn files are required" }, { status: 400 });
    }

    const toBase64 = async (f: File) => Buffer.from(await f.arrayBuffer()).toString("base64");

    const [invB64, poB64, grnB64] = await Promise.all([
      toBase64(invoice),
      toBase64(po),
      toBase64(grn),
    ]);

    const raw = await runThreeWayMatch(invB64, invoice.type, poB64, po.type, grnB64, grn.type);
    const result = JSON.parse(raw);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
