import { auth } from "@/app/(auth)/auth";
import { getAssignments, setAssignment, getOrgMembers } from "@/app/db";
import { getCurrentOrgIdOrSetDefault } from "@/app/api/orgs/_utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const orgId = await getCurrentOrgIdOrSetDefault(session.user.email);
  const rows = await getAssignments({ orgId });
  return Response.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const orgId = await getCurrentOrgIdOrSetDefault(session.user.email);
  const { labelSlug, assigneeEmail } = await request.json().catch(() => ({}));
  if (!labelSlug) return new Response("Missing labelSlug", { status: 400 });
  const members = await getOrgMembers({ orgId });
  if (assigneeEmail && !members.find((m) => m.userEmail === assigneeEmail)) {
    return new Response("Assignee not in org", { status: 400 });
  }
  await setAssignment({ orgId, labelSlug, assigneeEmail: assigneeEmail || null, assignedByEmail: session.user.email });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const orgId = await getCurrentOrgIdOrSetDefault(session.user.email);
  const { searchParams } = new URL(request.url);
  const labelSlug = searchParams.get("labelSlug");
  if (!labelSlug) return new Response("Missing labelSlug", { status: 400 });
  await setAssignment({ orgId, labelSlug, assigneeEmail: null, assignedByEmail: session.user.email });
  return Response.json({ ok: true });
}


