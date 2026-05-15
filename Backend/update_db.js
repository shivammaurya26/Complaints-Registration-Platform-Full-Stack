import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function addPhoneColumn() {
  try {
    console.log("Checking and adding 'phone' column...");
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;`;
    await sql`ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`;
    await sql`ALTER TABLE users ALTER COLUMN password DROP NOT NULL;`;
    console.log("Database updated successfully!");
  } catch (error) {
    console.error("Error updating database:", error);
  } finally {
    await sql.end();
  }
}

addPhoneColumn();
