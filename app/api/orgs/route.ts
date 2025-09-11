import { auth } from "@/app/(auth)/auth";
import { createOrganizationForUser, listOrganizationsForUser, getMembership, deleteOrganizationCascade, getOrganizationById } from "@/app/db";
import { list, del } from "@vercel/blob";
import { cookies } from "next/headers";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const email = session.user.email;
  const memberships = await listOrganizationsForUser(email);
  const orgs = await Promise.all(
    memberships.map(async (m: any) => {
      const org = await getOrganizationById({ orgId: m.orgId });
      return { orgId: m.orgId, role: m.role, name: org?.name || null, logoUrl: (org as any)?.logoUrl || null };
    }),
  );
  const current = cookies().get("orgId")?.value || null;
  return Response.json({ orgs, currentOrgId: current });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const email = session.user.email;
  const body = await request.json().catch(() => ({}));
  const name = (body?.name || "").toString().trim();
  if (!name) return new Response("Missing name", { status: 400 });
  const org = await createOrganizationForUser({ name, ownerEmail: email });
  cookies().set("orgId", org.id, { httpOnly: true, sameSite: "lax", path: "/" });
  return Response.json({ ok: true, org });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const email = session.user.email;
  const body = await request.json().catch(() => ({}));
  const orgId = (body?.orgId || "").toString();
  if (!orgId) return new Response("Missing orgId", { status: 400 });
  const m = await getMembership({ orgId, email });
  if (!m || m.role !== "owner") return new Response("Forbidden", { status: 403 });

  // Cleanup all blob objects under this org prefix to prevent storage leaks
  try {
    const { blobs } = await list({ prefix: orgId });
    if (blobs.length > 0) {
      await Promise.all(
        blobs.map((b: any) => del((b as any).url || (b as any).downloadUrl || (b as any).pathname))
      );
    }
  } catch (e) {
    // Best effort: blob cleanup failure shouldn't block DB deletion
    console.error("Blob cleanup failed for org", orgId, e);
  }
  await deleteOrganizationCascade({ orgId });
  const c = cookies();
  if (c.get("orgId")?.value === orgId) c.set("orgId", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return Response.json({ ok: true });
}


