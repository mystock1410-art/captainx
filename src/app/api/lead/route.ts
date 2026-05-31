import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lead = {
  email: string;
  phone: string;
  account: string;
  location: string;
  submittedAt: string;
  userAgent: string | null;
  ip: string | null;
};

function clean(s: unknown, max: number): string {
  return String(s ?? "").trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const email = clean(body.email, 200);
  const phone = clean(body.phone, 50);
  const account = clean(body.account, 100);
  const location = clean(body.location, 200);

  if (!email || !phone || !account || !location) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }

  const lead: Lead = {
    email,
    phone,
    account,
    location,
    submittedAt: new Date().toISOString(),
    userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  };

  // Always log to Vercel function logs — visible in dashboard.
  console.log("[CAPTAINX-LEAD]", JSON.stringify(lead));

  // Email the lead to the owner via FormSubmit (no signup, no API key).
  // FormSubmit requires Origin/Referer headers — without them it rejects with
  // "Make sure you open this page through a web server". On the very first
  // submission FormSubmit sends an "Activate Form" email to the recipient;
  // they must click the activation link once before normal delivery begins.
  const RECIPIENT = process.env.LEADS_EMAIL || "mystock1410@gmail.com";
  const origin = req.headers.get("origin") || `https://${req.headers.get("host") || "captainx.vercel.app"}`;
  try {
    const fsRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(RECIPIENT)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: origin,
        Referer: `${origin}/`,
      },
      body: JSON.stringify({
        _subject: `[Captain X] Lead mới · ${lead.email}`,
        _template: "table",
        _captcha: "false",
        Email: lead.email,
        "Số điện thoại": lead.phone,
        "Số tài khoản chứng khoán": lead.account,
        "Nơi sinh sống": lead.location,
        "Thời gian gửi": lead.submittedAt,
        IP: lead.ip ?? "",
        "User-Agent": lead.userAgent ?? "",
      }),
    });
    const fsBody = await fsRes.text();
    console.log("[CAPTAINX-LEAD] formsubmit status:", fsRes.status, "body:", fsBody);
  } catch (e) {
    // Don't fail the request if email fails — log was already written.
    console.warn("[CAPTAINX-LEAD] formsubmit failed:", e);
  }

  // Optional Discord/Slack webhook fallback.
  const webhook = process.env.LEADS_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🆕 Captain X lead\n\`\`\`json\n${JSON.stringify(lead, null, 2)}\n\`\`\``,
          lead,
        }),
      });
    } catch (e) {
      console.warn("[CAPTAINX-LEAD] webhook failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
