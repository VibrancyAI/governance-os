import { auth } from "@/app/(auth)/auth";
import {
  deleteAllOrgFileAssociations,
  deleteOrgFileAssociation,
  getOrgFileAssociations,
  upsertOrgFileAssociation,
} from "@/app/db";
import { getCurrentOrgIdOrSetDefault } from "@/app/api/orgs/_utils";

export async function GET() {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  const orgId = await getCurrentOrgIdOrSetDefault(session.user.email);
  const rows = await getOrgFileAssociations({ orgId });
  return Response.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  const orgId = await getCurrentOrgIdOrSetDefault(session.user.email);
  const body = await request.json();
  const { labelSlug, fileName, workingUrl } = body || {};
  if (!labelSlug) {
    return new Response("Missing labelSlug", { status: 400 });
  }
  await upsertOrgFileAssociation({ orgId, labelSlug, fileName, workingUrl });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  const orgId = await getCurrentOrgIdOrSetDefault(session.user.email);
  const { searchParams } = new URL(request.url);
  const labelSlug = searchParams.get("labelSlug");
  const all = searchParams.get("all");
  if (all === "true") {
    await deleteAllOrgFileAssociations({ orgId });
    return Response.json({ ok: true });
  }
  if (!labelSlug) {
    return new Response("Missing labelSlug", { status: 400 });
  }
  await deleteOrgFileAssociation({ orgId, labelSlug });
  return Response.json({ ok: true });
}


