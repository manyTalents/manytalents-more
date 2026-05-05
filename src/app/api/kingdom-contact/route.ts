import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Save to Supabase
    const supabase = createServiceClient();
    const { error: dbError } = await supabase
      .from("kingdom_contacts")
      .insert({ email });

    if (dbError) {
      console.error("Kingdom DB insert error:", dbError);
    }

    // Email Jonathan directly
    await getResend().emails.send({
      from: "ManyTalents More <kingdom@manytalentsmore.com>",
      to: "jonathan.uncapher@gmail.com",
      subject: "Someone Wants to Support Your Mission",
      text: [
        "Jonathan,",
        "",
        "Someone visited manytalentsmore.com/kingdom and wants to connect about supporting your mission in Cameroon.",
        "",
        `Their email: ${email}`,
        "",
        "You can reply directly to them at that address.",
        "",
        "God bless,",
        "— Sent via ManyTalents More",
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Kingdom contact error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
