import { auth } from "@/app/(auth)/auth";
import { deleteChunksByFilePath, deleteFileAssociationsByFileName, getMembership } from "@/app/db";
import { head, del } from "@vercel/blob";
import { getCurrentOrgIdOrSetDefault } from "@/app/api/orgs/_utils";

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);

  let session = await auth();

  if (!session) {
    return Response.redirect("/login");
  }

  const { user } = session;
  if (!user || !user.email) {
    return Response.redirect("/login");
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  const fileurl = searchParams.get("fileurl");

  if (fileurl === null) {
    return new Response("File url not provided", { status: 400 });
  }

  const { pathname } = await head(fileurl);
  const orgId = await getCurrentOrgIdOrSetDefault(user.email);
  const membership = await getMembership({ orgId, email: user.email });
  if (!membership || !["owner", "operator"].includes(membership.role)) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!pathname.startsWith(orgId)) {
    return new Response("Unauthorized", { status: 400 });
  }

  await del(fileurl);
  await deleteChunksByFilePath({ filePath: pathname });
  // org association cleanup is handled client-side per labelSlug

  return Response.json({});
}
