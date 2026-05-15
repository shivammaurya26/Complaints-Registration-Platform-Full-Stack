import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
console.log("Connecting to:", connectionString.replace(/:[^:]+@/, ':****@'));

const sql = postgres(connectionString);

async function test() {
    try {
        const result = await sql`SELECT 1 as test`;
        console.log("Connection successful:", result);
        process.exit(0);
    } catch (err) {
        console.error("Connection failed:", err);
        process.exit(1);
    }
}

test();
