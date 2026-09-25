import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import sql, { initSchema } from "./db.js";
import { createToken, requireAuth, requireAdmin } from "./auth.js";
import { sendBorrowConfirmation, sendReturnApprovalConfirmation } from "./email.js";
import GAMES from "../src/data/games.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── Auth routes ──────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, studentId, password, email } = req.body;

    if (!name || !studentId || !password || !email) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (!/^\d{8}$/.test(studentId)) {
      return res.status(400).json({ error: "Student ID must be exactly 8 digits" });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const existing = await sql`SELECT id FROM users WHERE student_id = ${studentId}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: "Student ID already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await sql`
      INSERT INTO users (name, student_id, password_hash, email)
      VALUES (${name}, ${studentId}, ${passwordHash}, ${email})
      RETURNING id, name, student_id, email, role
    `;

    res.status(201).json({ token: createToken(user), user: { id: user.id, name: user.name, studentId: user.student_id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { studentId, password } = req.body;

    const [user] = await sql`SELECT * FROM users WHERE student_id = ${studentId}`;
    if (!user) {
      return res.status(401).json({ error: "Invalid student ID or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid student ID or password" });
    }

    res.json({ token: createToken(user), user: { id: user.id, name: user.name, studentId: user.student_id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await sql`SELECT id, name, student_id, email, role FROM users WHERE id = ${req.user.id}`;
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, name: user.name, studentId: user.student_id, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.post("/api/auth/promote", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { studentId } = req.body;
    const [user] = await sql`
      UPDATE users SET role = 'admin' WHERE student_id = ${studentId}
      RETURNING id, name, student_id, role
    `;
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, name: user.name, studentId: user.student_id, role: user.role });
  } catch (err) {
    res.status(500).json({ error: "Failed to promote user" });
  }
});

// ── Borrowing routes ─────────────────────────────────────────

app.get("/api/borrowings/active", requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      SELECT b.id, b.game_id, b.borrow_date, b.expected_return_date, b.status,
             u.name AS borrower_name, u.student_id AS borrower_student_id
      FROM borrowings b
      JOIN users u ON u.id = b.user_id
      WHERE b.status IN ('active', 'pending_return')
      ORDER BY b.expected_return_date ASC
    `;
    res.json(rows);
  } catch (err) {
    console.error("Active borrowings error:", err);
    res.status(500).json({ error: "Failed to fetch active borrowings" });
  }
});

app.get("/api/borrowings/pending", requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      SELECT b.id, b.game_id, b.borrow_date, b.expected_return_date, b.return_photo, b.status,
             u.name AS borrower_name, u.student_id AS borrower_student_id
      FROM borrowings b
      JOIN users u ON u.id = b.user_id
      WHERE b.status = 'pending_return'
      ORDER BY b.expected_return_date ASC
    `;
    res.json(rows);
  } catch (err) {
    console.error("Pending returns error:", err);
    res.status(500).json({ error: "Failed to fetch pending returns" });
  }
});

app.get("/api/borrowings/history", requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      SELECT b.id, b.game_id, b.borrow_date, b.expected_return_date, b.returned_date,
             u.name AS borrower_name, u.student_id AS borrower_student_id
      FROM borrowings b
      JOIN users u ON u.id = b.user_id
      WHERE b.status = 'returned'
      ORDER BY b.returned_date DESC
    `;
    res.json(rows);
  } catch (err) {
    console.error("History error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.post("/api/borrowings", requireAuth, async (req, res) => {
  try {
    const { gameId, expectedReturnDate } = req.body;

    if (!gameId || !expectedReturnDate) {
      return res.status(400).json({ error: "gameId and expectedReturnDate are required" });
    }

    const existing = await sql`
      SELECT id FROM borrowings WHERE game_id = ${gameId} AND status IN ('active', 'pending_return')
    `;
    if (existing.length > 0) {
      return res.status(409).json({ error: "Game is already borrowed" });
    }

    const [borrowing] = await sql`
      INSERT INTO borrowings (game_id, user_id, expected_return_date)
      VALUES (${gameId}, ${req.user.id}, ${expectedReturnDate})
      RETURNING id, game_id, borrow_date, expected_return_date, status
    `;

    const [borrower] = await sql`SELECT email, name FROM users WHERE id = ${req.user.id}`;
    const game = GAMES.find((g) => g.id === gameId);
    if (borrower?.email && game) {
      sendBorrowConfirmation({
        email: borrower.email,
        name: borrower.name,
        gameName: game.name,
        borrowDate: borrowing.borrow_date?.toString().slice(0, 10) || new Date().toISOString().slice(0, 10),
        expectedReturnDate: expectedReturnDate,
      }).catch((err) => console.error("Email send error:", err));
    }

    res.status(201).json(borrowing);
  } catch (err) {
    console.error("Borrow error:", err);
    res.status(500).json({ error: "Failed to borrow game" });
  }
});

app.post("/api/borrowings/:id/return", requireAuth, async (req, res) => {
  try {
    const { photo } = req.body;

    if (!photo) {
      return res.status(400).json({ error: "Photo is required" });
    }

    const [borrowing] = await sql`
      UPDATE borrowings
      SET status = 'pending_return', return_photo = ${photo}
      WHERE id = ${req.params.id} AND status = 'active'
      RETURNING id, game_id, status
    `;

    if (!borrowing) {
      return res.status(404).json({ error: "Active borrowing not found" });
    }

    res.json(borrowing);
  } catch (err) {
    console.error("Return error:", err);
    res.status(500).json({ error: "Failed to submit return" });
  }
});

app.post("/api/borrowings/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [borrowing] = await sql`
      UPDATE borrowings
      SET status = 'returned', returned_date = CURRENT_DATE
      WHERE id = ${req.params.id} AND status = 'pending_return'
      RETURNING id, game_id, user_id, returned_date
    `;

    if (!borrowing) {
      return res.status(404).json({ error: "Pending return not found" });
    }

    const [borrower] = await sql`SELECT email, name FROM users WHERE id = ${borrowing.user_id}`;
    const game = GAMES.find((g) => g.id === borrowing.game_id);
    if (borrower?.email && game) {
      sendReturnApprovalConfirmation({
        email: borrower.email,
        name: borrower.name,
        gameName: game.name,
        returnedDate: borrowing.returned_date?.toString().slice(0, 10) || new Date().toISOString().slice(0, 10),
      }).catch((err) => console.error("Email send error:", err));
    }

    res.json(borrowing);
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ error: "Failed to approve return" });
  }
});

app.post("/api/borrowings/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [borrowing] = await sql`
      UPDATE borrowings
      SET status = 'active', return_photo = NULL
      WHERE id = ${req.params.id} AND status = 'pending_return'
      RETURNING id, game_id, status
    `;

    if (!borrowing) {
      return res.status(404).json({ error: "Pending return not found" });
    }

    res.json(borrowing);
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ error: "Failed to reject return" });
  }
});

// ── Start ────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
