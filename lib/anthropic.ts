import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function parseInvoice(base64File: string, mediaType: string): Promise<string> {
  const isImage = mediaType.startsWith("image/");

  const content: Anthropic.MessageParam["content"] = isImage
    ? [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64File },
        },
        {
          type: "text",
          text: INVOICE_PARSE_PROMPT,
        },
      ]
    : [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64File },
        },
        {
          type: "text",
          text: INVOICE_PARSE_PROMPT,
        },
      ];

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content }],
  });

  return (msg.content[0] as Anthropic.TextBlock).text;
}

const INVOICE_PARSE_PROMPT = `Extract the following fields from this invoice and return ONLY a valid JSON object with no extra text:
{
  "vendor": "vendor/supplier name",
  "vendorBillNo": "invoice/bill number",
  "billDate": "date of invoice in YYYY-MM-DD format",
  "dueDate": "payment due date in YYYY-MM-DD format, empty string if not found",
  "billAmount": "total amount before GST as a number string",
  "gst": "GST/tax amount as a number string, 0 if none",
  "tds": "TDS amount as a number string, 0 if none",
  "netAmount": "final payable amount as a number string",
  "billType": "one of: Material, Service, Labour, Utility, Other",
  "poNumber": "PO number if mentioned, else empty string"
}
If a field cannot be determined, use an empty string. Return only the JSON, nothing else.`;

export async function runThreeWayMatch(
  invoiceBase64: string,
  invoiceType: string,
  poBase64: string,
  poType: string,
  grnBase64: string,
  grnType: string,
): Promise<string> {
  const makeContent = (b64: string, mt: string): Anthropic.ContentBlockParam =>
    mt.startsWith("image/")
      ? { type: "image", source: { type: "base64", media_type: mt as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: b64 } }
      : { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } };

  const content: Anthropic.ContentBlockParam[] = [
    { type: "text", text: "Document 1 — INVOICE:" },
    makeContent(invoiceBase64, invoiceType),
    { type: "text", text: "Document 2 — PURCHASE ORDER (PO):" },
    makeContent(poBase64, poType),
    { type: "text", text: "Document 3 — GOODS RECEIPT NOTE (GRN):" },
    makeContent(grnBase64, grnType),
    { type: "text", text: THREE_WAY_MATCH_PROMPT },
  ];

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content }],
  });

  return (msg.content[0] as Anthropic.TextBlock).text;
}

const THREE_WAY_MATCH_PROMPT = `Perform a 3-way match between the Invoice, PO, and GRN above.
Return ONLY a valid JSON object with no extra text:
{
  "poVendor": "vendor name on PO",
  "invoiceVendor": "vendor name on invoice",
  "vendorMatch": true/false,
  "poNumber": "PO number on PO",
  "invoicePoNumber": "PO number referenced on invoice",
  "poNumberMatch": true/false,
  "poQty": "quantity on PO",
  "grnQty": "quantity on GRN",
  "invoiceQty": "quantity on invoice",
  "qtyMatch": true/false (PO qty == GRN qty == invoice qty),
  "poRate": "unit rate on PO",
  "invoiceRate": "unit rate on invoice",
  "rateMatch": true/false,
  "poAmount": "total amount on PO",
  "invoiceAmount": "total amount on invoice",
  "amountMatch": true/false (within 1 rupee tolerance),
  "gstOnPo": "GST rate/amount on PO",
  "gstOnInvoice": "GST rate/amount on invoice",
  "gstMatch": true/false,
  "overallMatch": true/false (all checks passed),
  "discrepancies": ["list of specific discrepancies found, empty if none"],
  "rawSummary": "2-3 sentence plain English summary of the match result"
}
Be strict: if a field is missing from any document, mark the relevant match as false and note it in discrepancies.
Return only the JSON, nothing else.`;
