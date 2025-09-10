import { auth } from "@/app/(auth)/auth";
import { getOrgMembers } from "@/app/db";
import { getCurrentOrgIdOrSetDefault } from "../_utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const orgId = await getCurrentOrgIdOrSetDefault(session.user.email);
  const members = await getOrgMembers({ orgId });
  return Response.json(members);
}


