import { drizzle } from "drizzle-orm/postgres-js";
import { and, desc, eq, inArray, like } from "drizzle-orm";
import postgres from "postgres";
import { genSaltSync, hashSync } from "bcrypt-ts";
import { chat, chunk, user, fileAssociation, organization, membership, invite, orgFileAssociation, itemAssignment, userProfile, fileMetadata as fileMetadataTable, extractedEntity as extractedEntityTable } from "@/schema";
import { randomUUID } from "crypto";

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

// Organizations
export async function listOrganizationsForUser(email: string) {
  return await db.select().from(membership).where(eq(membership.userEmail, email));
}

export async function createOrganizationForUser({ name, ownerEmail }: { name: string; ownerEmail: string }) {
  const id = randomUUID();
  const now = new Date();
  await db.insert(organization).values({ id, name, ownerEmail, createdAt: now });
  await db.insert(membership).values({ orgId: id, userEmail: ownerEmail, role: "owner", createdAt: now });
  return { id, name };
}

export async function ensureDefaultOrg({ email }: { email: string }) {
  const existing = await listOrganizationsForUser(email);
  if (existing.length > 0) return existing;
  await createOrganizationForUser({ name: `Personal — ${email}`, ownerEmail: email });
  return await listOrganizationsForUser(email);
}

export async function getMembership({ orgId, email }: { orgId: string; email: string }) {
  const rows = await db.select().from(membership).where(and(eq(membership.orgId, orgId), eq(membership.userEmail, email)));
  return rows[0] || null;
}

export async function getOrgMembers({ orgId }: { orgId: string }) {
  return await db.select().from(membership).where(eq(membership.orgId, orgId));
}

// Invites
export async function createInviteRecord({ orgId, email, role, inviterEmail, expiresAt }: { orgId: string; email: string; role: "owner" | "operator"; inviterEmail: string; expiresAt: Date }) {
  const token = randomUUID();
  const createdAt = new Date();
  await db.insert(invite).values({ token, orgId, email, role, inviterEmail, createdAt, expiresAt });
  return { token };
}

export async function getInviteByToken(token: string) {
  const rows = await db.select().from(invite).where(eq(invite.token, token));
  return rows[0] || null;
}

export async function acceptInvite({ token, accepterEmail }: { token: string; accepterEmail: string }) {
  const row = await getInviteByToken(token);
  if (!row) return null;
  const now = new Date();
  if (row.acceptedAt) return row;
  if (row.expiresAt < now) return null;
  if (row.email.toLowerCase() !== accepterEmail.toLowerCase()) return null;
  const existing = await getMembership({ orgId: row.orgId, email: accepterEmail });
  if (!existing) {
    await db.insert(membership).values({ orgId: row.orgId, userEmail: accepterEmail, role: row.role as any, createdAt: now });
  }
  await db.update(invite).set({ acceptedAt: now }).where(eq(invite.token, token));
  return row;
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

// File metadata persistence
export async function upsertFileMetadata({ orgId, filePath, filename, slug, section, currency, asOfDate, extractedEntities }: { orgId: string; filePath: string; filename: string; slug?: string; section?: string; currency?: string; asOfDate?: Date | null; extractedEntities?: any }) {
  // Simple upsert: delete then insert to avoid duplicates
  await db.delete(fileMetadataTable).where(and(eq(fileMetadataTable.orgId, orgId), eq(fileMetadataTable.filePath, filePath)));
  await db.insert(fileMetadataTable).values({ orgId, filePath, filename, slug: slug as any, section: section as any, currency: currency as any, asOfDate: (asOfDate ?? null) as any, extractedEntities: extractedEntities ?? null as any });
}

export async function insertExtractedEntities({ orgId, filePath, entities }: { orgId: string; filePath: string; entities: Array<{ key: string; value: string; confidence?: number; unit?: string; asOfDate?: Date | null }> }) {
  if (!entities || entities.length === 0) return;
  await db.insert(extractedEntityTable).values(entities.map((e) => ({ orgId, filePath, key: e.key, value: e.value, confidence: (e.confidence ?? null) as any, unit: (e.unit ?? null) as any, asOfDate: (e.asOfDate ?? null) as any })));
}

export async function getFileMetadataForOrg({ orgId }: { orgId: string }) {
  return await db.select().from(fileMetadataTable).where(eq(fileMetadataTable.orgId, orgId));
}

export async function getEntitiesForOrg({ orgId }: { orgId: string }) {
  return await db.select().from(extractedEntityTable).where(eq(extractedEntityTable.orgId, orgId));
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

// Org-level file associations
export async function getOrgFileAssociations({ orgId }: { orgId: string }) {
  return await db.select().from(orgFileAssociation).where(eq(orgFileAssociation.orgId, orgId));
}
export async function upsertOrgFileAssociation({ orgId, labelSlug, fileName, workingUrl }: { orgId: string; labelSlug: string; fileName?: string; workingUrl?: string }) {
  // Try insert first to avoid race conditions, on conflict fallback to update
  try {
    return await db.insert(orgFileAssociation).values({ orgId, labelSlug, fileName: (fileName ?? null) as any, workingUrl: (workingUrl ?? null) as any });
  } catch {
    return await db
      .update(orgFileAssociation)
      .set({ fileName: fileName ?? null as any, workingUrl: workingUrl ?? null as any })
      .where(and(eq(orgFileAssociation.orgId, orgId), eq(orgFileAssociation.labelSlug, labelSlug)));
  }
}
export async function deleteOrgFileAssociation({ orgId, labelSlug }: { orgId: string; labelSlug: string }) {
  return await db.delete(orgFileAssociation).where(and(eq(orgFileAssociation.orgId, orgId), eq(orgFileAssociation.labelSlug, labelSlug)));
}
export async function deleteAllOrgFileAssociations({ orgId }: { orgId: string }) {
  return await db.delete(orgFileAssociation).where(eq(orgFileAssociation.orgId, orgId));
}

// Assignments
export async function getAssignments({ orgId }: { orgId: string }) {
  return await db.select().from(itemAssignment).where(eq(itemAssignment.orgId, orgId));
}
export async function setAssignment({ orgId, labelSlug, assigneeEmail, assignedByEmail }: { orgId: string; labelSlug: string; assigneeEmail: string | null; assignedByEmail: string }) {
  const now = new Date();
  if (!assigneeEmail) {
    // no-op for multi-assignment removal: handled via deleteAssignment
    return;
  }
  await db.insert(itemAssignment).values({ orgId, labelSlug, assigneeEmail, assignedByEmail, assignedAt: now });
}

export async function deleteAssignment({ orgId, labelSlug, assigneeEmail }: { orgId: string; labelSlug: string; assigneeEmail?: string }) {
  if (assigneeEmail) {
    return await db.delete(itemAssignment).where(and(eq(itemAssignment.orgId, orgId), eq(itemAssignment.labelSlug, labelSlug), eq(itemAssignment.assigneeEmail, assigneeEmail)));
  }
  return await db.delete(itemAssignment).where(and(eq(itemAssignment.orgId, orgId), eq(itemAssignment.labelSlug, labelSlug)));
}

// Danger: destructive
export async function deleteOrganizationCascade({ orgId }: { orgId: string }) {
  // delete dependent rows first
  await db.delete(itemAssignment).where(eq(itemAssignment.orgId, orgId));
  await db.delete(orgFileAssociation).where(eq(orgFileAssociation.orgId, orgId));
  await db.delete(invite).where(eq(invite.orgId, orgId));
  await db.delete(membership).where(eq(membership.orgId, orgId));
  // delete RAG chunks for this org
  await db.delete(chunk).where(like(chunk.filePath, `${orgId}/%`));
  // finally delete org
  await db.delete(organization).where(eq(organization.id, orgId));
}

// Profiles
export async function getUserProfile({ email }: { email: string }) {
  const rows = await db.select().from(userProfile).where(eq(userProfile.email, email));
  return rows[0] || null;
}
export async function upsertUserProfile({ email, displayName, avatarUrl }: { email: string; displayName?: string; avatarUrl?: string }) {
  const existing = await getUserProfile({ email });
  if (existing) {
    await db.update(userProfile).set({ displayName: displayName ?? existing.displayName, avatarUrl: avatarUrl ?? existing.avatarUrl }).where(eq(userProfile.email, email));
  } else {
    await db.insert(userProfile).values({ email, displayName: displayName ?? null as any, avatarUrl: avatarUrl ?? null as any });
  }
}

export async function updateOrganizationMeta({ orgId, name, logoUrl }: { orgId: string; name?: string; logoUrl?: string }) {
  const updates: any = {};
  if (typeof name !== "undefined") updates.name = name;
  if (typeof logoUrl !== "undefined") updates.logoUrl = logoUrl;
  if (Object.keys(updates).length === 0) return;
  await db.update(organization).set(updates).where(eq(organization.id, orgId));
}

export async function getUserProfilesByEmails({ emails }: { emails: string[] }) {
  if (emails.length === 0) return [] as Array<{ email: string; displayName: string | null; avatarUrl: string | null }>;
  // Drizzle doesn't support IN on varchar without helper; use inArray on userProfile.email
  return await db.select().from(userProfile).where(inArray(userProfile.email, emails as any));
}

export async function getOrganizationById({ orgId }: { orgId: string }) {
  const rows = await db.select().from(organization).where(eq(organization.id, orgId));
  return rows[0] || null;
}
