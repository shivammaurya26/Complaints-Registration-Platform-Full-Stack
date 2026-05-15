import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function upgradeDatabase() {
  try {
    console.log("Adding professional tracking columns to 'complaints'...");
    
    // Add columns to complaints table
    await sql`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';`;
    await sql`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';`;
    await sql`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';`;
    
    // Clean up users table (optional, but keep it tidy)
    await sql`ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`;
    await sql`ALTER TABLE users ALTER COLUMN password DROP NOT NULL;`;
    
    console.log("Database upgraded successfully with professional fields!");
  } catch (error) {
    console.error("Error upgrading database:", error);
  } finally {
    await sql.end();
  }
}

upgradeDatabase();
