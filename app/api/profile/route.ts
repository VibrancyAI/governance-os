import { auth } from "@/app/(auth)/auth";
import { getUserProfile, upsertUserProfile } from "@/app/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const p = await getUserProfile({ email: session.user.email });
  return Response.json(p || {});
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const body = await request.json().catch(() => ({}));
  const { displayName, avatarUrl } = body || {};
  await upsertUserProfile({ email: session.user.email, displayName, avatarUrl });
  return Response.json({ ok: true });
}


