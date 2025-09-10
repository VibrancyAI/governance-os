import { auth } from "@/app/(auth)/auth";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");
  if (!filename || !request.body) return new Response("Bad request", { status: 400 });
  const { url } = await put(`uploads/${session.user.email}/${Date.now()}_${filename}`, request.body, { access: "public" }) as any;
  return Response.json({ url });
}


