import { NextRequest, NextResponse } from "next/server";
import { insertLead } from "@/lib/server/db";

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

function hostOf(u: string | null): string | null {
  if (!u) return null;
  try {
    return new URL(u).host;
  } catch {
    return null;
  }
}

// Mask sensitive values before they reach server logs (keep first/last chars).
function mask(s: string): string {
  if (!s) return "";
  if (s.length <= 4) return "***";
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

// Lightweight per-IP throttle. NOTE: in-memory and per-serverless-instance, so
// it only blunts bursts from a single warm instance — for durable protection
// across instances use a shared store (Vercel KV / Upstash).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function isThrottled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  // 1) Reject obvious cross-origin abuse: if the browser sent an Origin/Referer,
  //    it must match the host this route is served from.
  const host = req.headers.get("host");
  const srcHost = hostOf(req.headers.get("origin")) ?? hostOf(req.headers.get("referer"));
  if (host && srcHost && srcHost !== host) {
    return NextResponse.json({ ok: false, error: "bad origin" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // 2) Honeypot: a hidden field real users never fill. If present, pretend success
  //    and drop the submission silently (don't tip off the bot).
  if (clean(body.website, 200)) {
    return NextResponse.json({ ok: true });
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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  // 3) Rate limit per IP.
  if (ip && isThrottled(ip)) {
    return NextResponse.json({ ok: false, error: "too many requests" }, { status: 429 });
  }

  const lead: Lead = {
    email,
    phone,
    account,
    location,
    submittedAt: new Date().toISOString(),
    userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    ip,
  };

  // Persist to MySQL (self-hosted VPS). No-op + false when no DB is configured;
  // never throws, so email/webhook delivery still runs regardless.
  const stored = await insertLead({
    email: lead.email,
    phone: lead.phone,
    account: lead.account,
    location: lead.location,
    ip: lead.ip,
    userAgent: lead.userAgent,
  });

  // Log a REDACTED record — phone + brokerage account are masked so plaintext
  // PII never lands in the log stream.
  console.log(
    "[CAPTAINX-LEAD]",
    JSON.stringify({
      email: lead.email,
      phone: mask(lead.phone),
      account: mask(lead.account),
      location: lead.location,
      submittedAt: lead.submittedAt,
      ip: lead.ip,
      stored,
    }),
  );

  // Email the lead to the owner via FormSubmit (no signup, no API key).
  // FormSubmit requires Origin/Referer headers — without them it rejects with
  // "Make sure you open this page through a web server". On the very first
  // submission FormSubmit sends an "Activate Form" email to the recipient;
  // they must click the activation link once before normal delivery begins.
  const RECIPIENT = process.env.LEADS_EMAIL || "mystock1410@gmail.com";
  const origin = req.headers.get("origin") || `https://${host || "captainx.vn"}`;
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
    // Log status only — the echoed body can contain the submitted PII.
    console.log("[CAPTAINX-LEAD] formsubmit status:", fsRes.status);
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
