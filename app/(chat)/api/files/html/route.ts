import { auth } from "@/app/(auth)/auth";
import { list } from "@vercel/blob";
import mammoth from "mammoth";
import { getCurrentOrgIdOrSetDefault } from "@/app/api/orgs/_utils";

async function fetchAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`upstream ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

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
    const buffer = await fetchAsBuffer(sourceUrl);
    const { value: html } = await mammoth.convertToHtml({ buffer }, {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
      ],
      includeDefaultStyleMap: true,
    });

    return new Response(html || "", {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("/api/files/html conversion error", e);
    return new Response("Failed to convert document", { status: 500 });
  }
}


