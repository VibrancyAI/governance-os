import { auth } from "@/app/(auth)/auth";
import { list } from "@vercel/blob";
import { getCurrentOrgIdOrSetDefault } from "@/app/api/orgs/_utils";

export async function GET() {
  let session = await auth();

  if (!session) {
    return Response.redirect("/login");
  }

  const { user } = session;
  if (!user) {
    return Response.redirect("/login");
  }

  const orgId = await getCurrentOrgIdOrSetDefault(user.email!);
  const { blobs } = await list({ prefix: orgId });

  return Response.json(
    blobs.map((blob) => ({
      ...blob,
      pathname: blob.pathname.replace(`${orgId}/`, ""),
    })),
  );
}
