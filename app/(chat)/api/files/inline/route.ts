import { auth } from "@/app/(auth)/auth";
import { list } from "@vercel/blob";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return new Response("Missing name", { status: 400 });
  }

  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return Response.redirect("/login");
  }

  const userEmail = session.user.email;

  // Find blob by exact path: <email>/<name>
  const { blobs } = await list({ prefix: userEmail });
  const blob = blobs.find((b) => b.pathname === `${userEmail}/${name}`);
  if (!blob) {
    return new Response("Not found", { status: 404 });
  }

  const sourceUrl = (blob as any).downloadUrl || (blob as any).url;
  if (!sourceUrl) {
    return new Response("No source URL", { status: 500 });
  }

  const upstream = await fetch(sourceUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream fetch failed", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";

  // Stream through with inline disposition so browsers render if possible
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}


