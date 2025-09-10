import { auth } from "@/app/(auth)/auth";
import { getMembership } from "@/app/db";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const { orgId } = await request.json().catch(() => ({}));
  if (!orgId) return new Response("Missing orgId", { status: 400 });
  const m = await getMembership({ orgId, email: session.user.email });
  if (!m) return new Response("Forbidden", { status: 403 });
  cookies().set("orgId", orgId, { httpOnly: true, sameSite: "lax", path: "/" });
  return Response.json({ ok: true });
}


