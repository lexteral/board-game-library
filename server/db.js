import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

export async function initSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      student_id VARCHAR(8) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'student',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS borrowings (
      id SERIAL PRIMARY KEY,
      game_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
      expected_return_date DATE NOT NULL,
      returned_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_borrowings_status ON borrowings(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_borrowings_game_id ON borrowings(game_id)`;

  await sql`ALTER TABLE borrowings ADD COLUMN IF NOT EXISTS return_photo TEXT`;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`;

  console.log("Database schema ready");
}

export default sql;
