import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    await resend.emails.send({
      from: "Kingdom Support <onboarding@resend.dev>",
      to: "Christoph3reverding@gmail.com",
      subject: "Kingdom Support Inquiry — ManyTalents More",
      text: `Someone wants to connect about supporting God's Kingdom.\n\nTheir email: ${email}\n\nThis came from manytalentsmore.com/kingdom`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Kingdom contact error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
