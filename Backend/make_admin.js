import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function makeAdmin() {
  try {
    console.log("Upgrading shivammaurya301@gmail.com to Admin...");
    const result = await sql`UPDATE users SET role = 'admin' WHERE email = 'shivammaurya301@gmail.com' RETURNING *;`;
    if (result.length > 0) {
      console.log("Success! You are now an Admin.");
    } else {
      console.log("User not found. Make sure the email is correct.");
    }
  } catch (error) {
    console.error("Error updating user role:", error);
  } finally {
    await sql.end();
  }
}

makeAdmin();
