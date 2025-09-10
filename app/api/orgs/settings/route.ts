import { auth } from "@/app/(auth)/auth";
import { getMembership, updateOrganizationMeta } from "@/app/db";
import { getCurrentOrgIdOrSetDefault } from "@/app/api/orgs/_utils";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const orgId = await getCurrentOrgIdOrSetDefault(session.user.email);
  const m = await getMembership({ orgId, email: session.user.email });
  if (!m || m.role !== "owner") return new Response("Forbidden", { status: 403 });
  const { name, logoUrl } = await request.json().catch(() => ({}));
  await updateOrganizationMeta({ orgId, name, logoUrl });
  return Response.json({ ok: true });
}


