import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, message, source } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Upsert into early_access_requests
    const { error: dbError } = await getSupabase()
      .from("early_access_requests")
      .upsert(
        {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          company: company?.trim() || null,
          message: message.trim(),
          type: "upgrade",
          source: source || "contact_page",
        },
        { onConflict: "email" }
      );

    if (dbError) {
      console.error("Contact form DB error:", dbError);
      return NextResponse.json(
        { error: "Failed to save. Please try again." },
        { status: 500 }
      );
    }

    // Send notification email (fire-and-forget — never block the response)
    if (resend) {
      resend.emails
        .send({
          from: "AluminatiAi <notifications@aluminatiai.com>",
          to: "contact@aluminatiai.com",
          subject: `Upgrade request from ${name.trim()}${company ? ` at ${company.trim()}` : ""}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0a0a;color:#e5e5e5;border-radius:8px">
              <h2 style="color:#fff;margin-top:0">New Upgrade Request</h2>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;color:#9ca3af;width:100px">Name</td><td style="padding:8px 0;color:#fff;font-weight:600">${name.trim()}</td></tr>
                <tr><td style="padding:8px 0;color:#9ca3af">Email</td><td style="padding:8px 0"><a href="mailto:${email.trim()}" style="color:#a855f7">${email.trim()}</a></td></tr>
                ${company ? `<tr><td style="padding:8px 0;color:#9ca3af">Company</td><td style="padding:8px 0;color:#fff">${company.trim()}</td></tr>` : ""}
                <tr><td style="padding:8px 0;color:#9ca3af">Source</td><td style="padding:8px 0;color:#6b7280;font-size:12px">${source || "contact_page"}</td></tr>
              </table>
              <div style="margin-top:16px;padding:16px;background:#1a1a1a;border-radius:6px;border-left:3px solid #a855f7">
                <p style="margin:0;color:#d1d5db;line-height:1.6">${message.trim().replace(/\n/g, "<br>")}</p>
              </div>
              <p style="margin-top:16px;font-size:12px;color:#6b7280">Submitted ${new Date().toUTCString()}</p>
            </div>
          `,
        })
        .catch((err: unknown) => console.error("Resend error:", err));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
