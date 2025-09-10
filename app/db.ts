import { drizzle } from "drizzle-orm/postgres-js";
import { and, desc, eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import { genSaltSync, hashSync } from "bcrypt-ts";
import { chat, chunk, user, fileAssociation } from "@/schema";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle
// Accept Neon/managed Postgres URLs as-is; append sslmode=require only if missing
const rawDatabaseUrl = process.env.POSTGRES_URL!;
const databaseUrl = /[?&]sslmode=/.test(rawDatabaseUrl)
  ? rawDatabaseUrl
  : `${rawDatabaseUrl}${rawDatabaseUrl.includes("?") ? "&" : "?"}sslmode=require`;
let client = postgres(databaseUrl);
let db = drizzle(client);

export async function getUser(email: string) {
  return await db.select().from(user).where(eq(user.email, email));
}

export async function createUser(email: string, password: string) {
  let salt = genSaltSync(10);
  let hash = hashSync(password, salt);

  return await db.insert(user).values({ email, password: hash });
}

export async function createMessage({
  id,
  messages,
  author,
}: {
  id: string;
  messages: any;
  author: string;
}) {
  const selectedChats = await db.select().from(chat).where(eq(chat.id, id));

  if (selectedChats.length > 0) {
    return await db
      .update(chat)
      .set({
        messages: JSON.stringify(messages),
      })
      .where(eq(chat.id, id));
  }

  return await db.insert(chat).values({
    id,
    createdAt: new Date(),
    messages: JSON.stringify(messages),
    author,
  });
}

export async function getChatsByUser({ email }: { email: string }) {
  return await db
    .select()
    .from(chat)
    .where(eq(chat.author, email))
    .orderBy(desc(chat.createdAt));
}

export async function getChatById({ id }: { id: string }) {
  const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
  return selectedChat;
}

export async function insertChunks({ chunks }: { chunks: any[] }) {
  return await db.insert(chunk).values(chunks);
}

export async function getChunksByFilePaths({
  filePaths,
}: {
  filePaths: Array<string>;
}) {
  return await db
    .select()
    .from(chunk)
    .where(inArray(chunk.filePath, filePaths));
}

export async function deleteChunksByFilePath({
  filePath,
}: {
  filePath: string;
}) {
  return await db.delete(chunk).where(eq(chunk.filePath, filePath));
}

export async function getFileAssociationsByUser({
  email,
}: {
  email: string;
}) {
  return await db
    .select()
    .from(fileAssociation)
    .where(eq(fileAssociation.userEmail, email));
}

export async function upsertFileAssociation({
  userEmail,
  labelSlug,
  fileName,
  workingUrl,
}: {
  userEmail: string;
  labelSlug: string;
  fileName?: string;
  workingUrl?: string;
}) {
  const existing = await db
    .select()
    .from(fileAssociation)
    .where(
      and(
        eq(fileAssociation.userEmail, userEmail),
        eq(fileAssociation.labelSlug, labelSlug),
      ),
    );
  if (existing.length > 0) {
    return await db
      .update(fileAssociation)
      .set({ fileName: fileName ?? existing[0].fileName, workingUrl: workingUrl ?? existing[0].workingUrl })
      .where(
        and(
          eq(fileAssociation.userEmail, userEmail),
          eq(fileAssociation.labelSlug, labelSlug),
        ),
      );
  }
  return await db.insert(fileAssociation).values({ userEmail, labelSlug, fileName: fileName ?? null as any, workingUrl: workingUrl ?? null as any });
}

export async function deleteFileAssociation({
  userEmail,
  labelSlug,
}: {
  userEmail: string;
  labelSlug: string;
}) {
  return await db
    .delete(fileAssociation)
    .where(
      and(
        eq(fileAssociation.userEmail, userEmail),
        eq(fileAssociation.labelSlug, labelSlug),
      ),
    );
}

export async function deleteFileAssociationsByFileName({
  userEmail,
  fileName,
}: {
  userEmail: string;
  fileName: string;
}) {
  return await db
    .delete(fileAssociation)
    .where(
      and(
        eq(fileAssociation.userEmail, userEmail),
        eq(fileAssociation.fileName, fileName),
      ),
    );
}

export async function deleteAllFileAssociations({
  userEmail,
}: {
  userEmail: string;
}) {
  return await db
    .delete(fileAssociation)
    .where(eq(fileAssociation.userEmail, userEmail));
}
