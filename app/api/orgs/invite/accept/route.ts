import { auth } from "@/app/(auth)/auth";
import { acceptInvite, getInviteByToken } from "@/app/db";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 400 });

  const session = await auth();
  if (!session?.user?.email) {
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return Response.redirect(`${appUrl}/login?next=${encodeURIComponent(`/api/orgs/invite/accept?token=${token}`)}`);
  }

  const row = await getInviteByToken(token);
  if (!row) return new Response("Invalid invite", { status: 400 });
  const accepted = await acceptInvite({ token, accepterEmail: session.user.email });
  if (!accepted) return new Response("Invite not valid", { status: 400 });
  cookies().set("orgId", row.orgId, { httpOnly: true, sameSite: "lax", path: "/" });
  return Response.redirect("/");
}


