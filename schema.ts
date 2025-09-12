import { Message } from "ai";
import { InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  real,
  timestamp,
  json,
  primaryKey,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  email: varchar("email", { length: 64 }).primaryKey().notNull(),
  password: varchar("password", { length: 64 }),
});

export const organization = pgTable("Organization", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  ownerEmail: varchar("ownerEmail", { length: 64 })
    .notNull()
    .references(() => user.email),
  createdAt: timestamp("createdAt").notNull(),
});

export const membership = pgTable(
  "Membership",
  {
    orgId: text("orgId").notNull().references(() => organization.id),
    userEmail: varchar("userEmail", { length: 64 })
      .notNull()
      .references(() => user.email),
    role: varchar("role", { length: 16 }).notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.orgId, table.userEmail] }),
    };
  },
);

export const invite = pgTable("Invite", {
  token: text("token").primaryKey().notNull(),
  orgId: text("orgId").notNull().references(() => organization.id),
  email: varchar("email", { length: 64 }).notNull(),
  role: varchar("role", { length: 16 }).notNull(),
  inviterEmail: varchar("inviterEmail", { length: 64 })
    .notNull()
    .references(() => user.email),
  createdAt: timestamp("createdAt").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
});

export const userProfile = pgTable("UserProfile", {
  email: varchar("email", { length: 64 }).primaryKey().notNull().references(() => user.email),
  displayName: text("displayName"),
  avatarUrl: text("avatarUrl"),
});

export const chat = pgTable("Chat", {
  id: text("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt").notNull(),
  messages: json("messages").notNull(),
  author: varchar("author", { length: 64 })
    .notNull()
    .references(() => user.email),
});

export const chunk = pgTable("Chunk", {
  id: text("id").primaryKey().notNull(),
  filePath: text("filePath").notNull(),
  section: text("section"),
  slug: text("slug"),
  sourceUrl: text("sourceUrl"),
  asOfDate: timestamp("asOfDate"),
  content: text("content").notNull(),
  embedding: real("embedding").array().notNull(),
});

export const fileMetadata = pgTable("FileMetadata", {
  orgId: text("orgId").notNull().references(() => organization.id),
  filePath: text("filePath").notNull(),
  filename: text("filename").notNull(),
  slug: text("slug"),
  section: text("section"),
  currency: text("currency"),
  asOfDate: timestamp("asOfDate"),
  extractedEntities: json("extractedEntities"),
});

export const extractedEntity = pgTable("ExtractedEntity", {
  orgId: text("orgId").notNull().references(() => organization.id),
  filePath: text("filePath").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  confidence: real("confidence"),
  unit: text("unit"),
  asOfDate: timestamp("asOfDate"),
});

export const orgFileAssociation = pgTable(
  "OrgFileAssociation",
  {
    orgId: text("orgId").notNull().references(() => organization.id),
    labelSlug: text("labelSlug").notNull(),
    fileName: text("fileName"),
    workingUrl: text("workingUrl"),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.orgId, table.labelSlug] }),
    };
  },
);

export const fileAssociation = pgTable(
  "FileAssociation",
  {
    userEmail: varchar("userEmail", { length: 64 })
      .notNull()
      .references(() => user.email),
    labelSlug: text("labelSlug").notNull(),
    fileName: text("fileName"),
    workingUrl: text("workingUrl"),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userEmail, table.labelSlug] }),
    };
  },
);

export const itemAssignment = pgTable(
  "ItemAssignment",
  {
    orgId: text("orgId").notNull().references(() => organization.id),
    labelSlug: text("labelSlug").notNull(),
    assigneeEmail: varchar("assigneeEmail", { length: 64 }).notNull().references(() => user.email),
    assignedByEmail: varchar("assignedByEmail", { length: 64 })
      .notNull()
      .references(() => user.email),
    assignedAt: timestamp("assignedAt").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.orgId, table.labelSlug, table.assigneeEmail] }),
    };
  },
);

export type Chat = Omit<InferSelectModel<typeof chat>, "messages"> & {
  messages: Array<Message>;
};

export type Chunk = InferSelectModel<typeof chunk>;
export type FileAssociation = InferSelectModel<typeof fileAssociation>;
export type Organization = InferSelectModel<typeof organization>;
export type Membership = InferSelectModel<typeof membership>;
export type Invite = InferSelectModel<typeof invite>;
export type OrgFileAssociation = InferSelectModel<typeof orgFileAssociation>;
export type ItemAssignment = InferSelectModel<typeof itemAssignment>;
