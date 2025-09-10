import { cookies } from "next/headers";
import { ensureDefaultOrg, getMembership } from "@/app/db";

export async function getCurrentOrgIdOrSetDefault(email: string) {
  const c = cookies();
  const cookieOrgId = c.get("orgId")?.value;
  if (cookieOrgId) {
    const m = await getMembership({ orgId: cookieOrgId, email });
    if (m) return cookieOrgId;
  }
  const orgs = await ensureDefaultOrg({ email });
  const first: any = orgs[0];
  const orgId = first?.orgId || first?.id;
  if (orgId) {
    c.set("orgId", orgId, { httpOnly: true, sameSite: "lax", path: "/" });
    return orgId as string;
  }
  throw new Error("Unable to resolve current org");
}


