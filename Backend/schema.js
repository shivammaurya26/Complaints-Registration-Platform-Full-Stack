import { pgTable, serial, text, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }).unique(),
  password: text('password'),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const complaints = pgTable('complaints', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  complaintText: text('complaint_text').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, in-progress, resolved
  category: varchar('category', { length: 50 }).default('general'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  createdAt: timestamp('created_at').defaultNow(),
});
