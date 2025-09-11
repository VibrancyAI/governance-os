import { auth } from "@/app/(auth)/auth";
import { createInviteRecord, getMembership } from "@/app/db";
import { getCurrentOrgIdOrSetDefault } from "../_utils";
import { Resend } from "resend";
import { InviteEmail } from "@/emails/InviteEmail";

const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY || "";
// Lazily instantiate to avoid build-time throw when env var is missing in build step
let resend: Resend | null = null;
if (apiKey) {
  try {
    resend = new Resend(apiKey);
  } catch {
    resend = null;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const orgId = await getCurrentOrgIdOrSetDefault(session.user.email);
  const me = await getMembership({ orgId, email: session.user.email });
  if (!me || me.role !== "owner") return new Response("Forbidden", { status: 403 });

  const { email, role } = await request.json().catch(() => ({}));
  if (!email || !["owner", "operator"].includes(role)) return new Response("Bad request", { status: 400 });

  const { token } = await createInviteRecord({
    orgId,
    email,
    role,
    inviterEmail: session.user.email,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  });

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const acceptUrl = `${appUrl}/api/orgs/invite/accept?token=${encodeURIComponent(token)}`;

  if (!apiKey || !resend) {
    return Response.json({ ok: true, sent: false, token });
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || "Acme <onboarding@resend.dev>",
      to: email,
      subject: `You're invited to ${orgId}`,
      react: InviteEmail({ orgName: orgId, inviterEmail: session.user.email, acceptUrl, role }),
    });
    if (error) {
      console.error("Resend send error", error);
      return Response.json({ ok: true, sent: false, error: error.message || "send_failed", status: (error as any).statusCode });
    }
    return Response.json({ ok: true, sent: true });
  } catch (e: any) {
    console.error("Resend send exception", e);
    return Response.json({ ok: true, sent: false, error: e?.message || "send_failed" });
  }
}


