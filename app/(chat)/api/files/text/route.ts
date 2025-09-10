import { auth } from "@/app/(auth)/auth";
import { list } from "@vercel/blob";
import { extractTextFromUrl } from "@/utils/extract";
import { getCurrentOrgIdOrSetDefault } from "@/app/api/orgs/_utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return new Response("Missing name", { status: 400 });
  }

  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const orgId = await getCurrentOrgIdOrSetDefault(session.user.email);
  const { blobs } = await list({ prefix: orgId });
  const blob = blobs.find((b) => b.pathname === `${orgId}/${name}`);
  if (!blob) {
    return new Response("Not found", { status: 404 });
  }

  const sourceUrl = (blob as any).downloadUrl || (blob as any).url;
  if (!sourceUrl) {
    return new Response("No source URL", { status: 500 });
  }

  try {
    const text = await extractTextFromUrl(name, sourceUrl);
    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return new Response("Failed to extract text", { status: 500 });
  }
}


