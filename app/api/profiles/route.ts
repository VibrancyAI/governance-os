import { auth } from "@/app/(auth)/auth";
import { getUserProfilesByEmails } from "@/app/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const { searchParams } = new URL(request.url);
  const emailsParam = searchParams.get("emails") || "";
  const emails = emailsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (emails.length === 0) return Response.json([]);
  const rows = await getUserProfilesByEmails({ emails });
  return Response.json(rows);
}


