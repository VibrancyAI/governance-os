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
    return new Response("Unauthorized", { status: 401 });
  }

  const userEmail = session.user.email;
  const { blobs } = await list({ prefix: userEmail });
  const blob = blobs.find((b) => b.pathname === `${userEmail}/${name}`);
  if (!blob) {
    return new Response("Not found", { status: 404 });
  }

  const url = (blob as any).url || (blob as any).downloadUrl;
  if (!url) {
    return new Response("No URL", { status: 500 });
  }

  return Response.json({ url });
}


