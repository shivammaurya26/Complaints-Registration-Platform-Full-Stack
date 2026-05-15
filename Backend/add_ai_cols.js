import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function addAIColumns() {
  try {
    console.log("Adding AI investigation columns...");
    await sql`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ai_question TEXT;`;
    await sql`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS user_answer TEXT;`;
    console.log("AI columns added successfully!");
  } catch (error) {
    console.error("Error adding AI columns:", error);
  } finally {
    await sql.end();
  }
}

addAIColumns();
