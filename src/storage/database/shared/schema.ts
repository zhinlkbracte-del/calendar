import { pgTable, serial, timestamp, index, varchar, text, boolean, jsonb, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// PostgreSQL built-in function - declare for TypeScript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gen_random_uuid(): string { return ''; }


export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const events = pgTable("events", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	date: varchar({ length: 10 }).notNull(),
	category: varchar({ length: 20 }).notNull(),
	status: varchar({ length: 20 }).default('not_started').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	sortOrder: varchar("sort_order", { length: 50 }).default('0'),
	priority: varchar({ length: 20 }).default('normal').notNull(),
	userId: varchar("user_id", { length: 36 }),
	taskId: varchar("task_id", { length: 36 }),
	reminderAt: timestamp("reminder_at", { withTimezone: true, mode: 'string' }),
	reminderNotified: boolean("reminder_notified").default(false).notNull(),
}, (table) => [
index("events_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
index("events_date_idx").using("btree", table.date.asc().nullsLast().op("text_ops")),
index("events_priority_idx").using("btree", table.priority.asc().nullsLast().op("text_ops")),
index("events_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
index("events_task_id_idx").using("btree", table.taskId.asc().nullsLast().op("text_ops")),
index("events_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const users = pgTable("users", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	phone: varchar({ length: 20 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	nickname: varchar({ length: 20 }).notNull(),
	avatarKey: varchar("avatar_key", { length: 500 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
index("users_phone_idx").using("btree", table.phone.asc().nullsLast().op("text_ops")),
unique("users_phone_unique").on(table.phone),
]);

export const dateSettings = pgTable("date_settings", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	date: varchar({ length: 10 }).notNull(),
	dayType: varchar("day_type", { length: 10 }).default('workday').notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
index("date_settings_date_idx").using("btree", table.date.asc().nullsLast().op("text_ops")),
index("date_settings_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
unique("date_settings_date_user_id_key").on(table.date, table.userId),
]);

export const tasks = pgTable("tasks", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	startDate: varchar("start_date", { length: 10 }),
	plannedEndDate: varchar("planned_end_date", { length: 10 }),
	actualEndDate: varchar("actual_end_date", { length: 10 }),
	delayStatus: varchar("delay_status", { length: 20 }).default('normal').notNull(),
	latestProgress: text("latest_progress"),
	urgencyType: varchar("urgency_type", { length: 30 }).default('not_important_not_urgent').notNull(),
	status: varchar({ length: 20 }).default('not_started').notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
index("tasks_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
index("tasks_urgency_type_idx").using("btree", table.urgencyType.asc().nullsLast().op("text_ops")),
index("tasks_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const agentConfigs = pgTable("agent_configs", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	name: varchar({ length: 50 }).default('My Agent').notNull(),
	apiKey: varchar("api_key", { length: 64 }).notNull(),
	permissions: jsonb().default({ events: { read: true, create: true, update: true, delete: true }, tasks: { read: true, create: true, update: true, delete: true } }).notNull(),
	webhookUrl: varchar("webhook_url", { length: 500 }),
	webhookSecret: varchar("webhook_secret", { length: 255 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
index("agent_configs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
unique("agent_configs_api_key_unique").on(table.apiKey),
]);
