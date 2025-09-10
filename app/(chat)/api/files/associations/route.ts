import { auth } from "@/app/(auth)/auth";
import {
  deleteAllFileAssociations,
  deleteFileAssociation,
  getFileAssociationsByUser,
  upsertFileAssociation,
} from "@/app/db";

export async function GET() {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  const rows = await getFileAssociationsByUser({ email: session.user.email });
  return Response.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await request.json();
  const { labelSlug, fileName, workingUrl } = body || {};
  if (!labelSlug) {
    return new Response("Missing labelSlug", { status: 400 });
  }
  await upsertFileAssociation({
    userEmail: session.user.email,
    labelSlug,
    fileName,
    workingUrl,
  });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const labelSlug = searchParams.get("labelSlug");
  const all = searchParams.get("all");
  if (all === "true") {
    await deleteAllFileAssociations({ userEmail: session.user.email });
    return Response.json({ ok: true });
  }
  if (!labelSlug) {
    return new Response("Missing labelSlug", { status: 400 });
  }
  await deleteFileAssociation({
    userEmail: session.user.email,
    labelSlug,
  });
  return Response.json({ ok: true });
}


