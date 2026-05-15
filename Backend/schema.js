import { pgTable, serial, text, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 20 }), // New phone field
  email: varchar('email', { length: 255 }).unique(), // No longer notNull
  password: text('password'), // No longer notNull
  role: varchar('role', { length: 20 }).notNull().default('user'),
  otp: varchar('otp', { length: 6 }),
  otpExpiry: timestamp('otp_expiry'),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const complaints = pgTable('complaints', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  complaintText: text('complaint_text').notNull(),
  aiQuestion: text('ai_question'),
  userAnswer: text('user_answer'),
  createdAt: timestamp('created_at').defaultNow(),
});
