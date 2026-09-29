import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import sql, { initSchema } from "./db.js";
import { createToken, requireAuth, requireAdmin } from "./auth.js";
import { sendBorrowConfirmation, sendReturnApprovalConfirmation, sendDueReminder } from "./email.js";
import { sendSms, smsConfigured } from "./sms.js";
import GAMES from "../src/data/games.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const normalizePhone = (p) => String(p || "").replace(/[\s-]/g, "");
const PHONE_RE = /^0\d{9}$/;

function userJson(u) {
  return { id: u.id, name: u.name, studentId: u.student_id, email: u.email, phone: u.phone, role: u.role };
}

// ── Auth routes ──────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, studentId, password, email } = req.body;
    const phone = normalizePhone(req.body.phone);

    if (!name || !studentId || !password || !email || !phone) {
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
    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({ error: "Phone number must be 10 digits starting with 0" });
    }

    const existing = await sql`SELECT id FROM users WHERE student_id = ${studentId}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: "Student ID already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await sql`
      INSERT INTO users (name, student_id, password_hash, email, phone)
      VALUES (${name}, ${studentId}, ${passwordHash}, ${email}, ${phone})
      RETURNING id, name, student_id, email, phone, role
    `;

    res.status(201).json({ token: createToken(user), user: userJson(user) });
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

    res.json({ token: createToken(user), user: userJson(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await sql`SELECT id, name, student_id, email, phone, role FROM users WHERE id = ${req.user.id}`;
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(userJson(user));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.put("/api/auth/profile", requireAuth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const phone = normalizePhone(req.body.phone);
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }
    if (phone && !PHONE_RE.test(phone)) {
      return res.status(400).json({ error: "Phone number must be 10 digits starting with 0" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    const [user] = await sql`
      UPDATE users SET name = ${name}, email = ${email}, phone = ${phone || null}
      WHERE id = ${req.user.id}
      RETURNING id, name, student_id, email, phone, role
    `;
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(userJson(user));
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.put("/api/auth/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required" });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: "New password must be at least 4 characters" });
    }
    const [user] = await sql`SELECT password_hash FROM users WHERE id = ${req.user.id}`;
    if (!user) return res.status(404).json({ error: "User not found" });
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${req.user.id}`;
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Failed to change password" });
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

// ── Admin: status overview ───────────────────────────────────

app.get("/api/admin/games-status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const current = await sql`
      SELECT b.id, b.game_id, b.borrow_date, b.expected_return_date, b.status, b.last_sms_at,
             u.name AS borrower_name, u.student_id AS borrower_student_id, u.phone, u.email,
             ((NOW() AT TIME ZONE 'Asia/Bangkok')::date - b.borrow_date) AS days_borrowed,
             GREATEST((NOW() AT TIME ZONE 'Asia/Bangkok')::date - b.expected_return_date, 0) AS days_overdue
      FROM borrowings b
      JOIN users u ON u.id = b.user_id
      WHERE b.status IN ('active', 'pending_return')
    `;
    const counts = await sql`
      SELECT game_id, COUNT(*)::int AS total FROM borrowings GROUP BY game_id
    `;
    res.json({ current, counts });
  } catch (err) {
    console.error("Games status error:", err);
    res.status(500).json({ error: "Failed to fetch game status" });
  }
});

app.get("/api/admin/borrowers", requireAuth, requireAdmin, async (req, res) => {
  try {
    const borrowers = await sql`
      SELECT u.id, u.name, u.student_id, u.phone, u.email,
             COUNT(b.id)::int AS total_loans,
             (COUNT(b.id) FILTER (WHERE b.status IN ('active', 'pending_return')))::int AS active_loans,
             ROUND(AVG(b.returned_date - b.borrow_date) FILTER (WHERE b.status = 'returned'), 1) AS avg_days,
             MAX(b.returned_date - b.borrow_date) FILTER (WHERE b.status = 'returned') AS max_days,
             (COUNT(b.id) FILTER (WHERE
                (b.status = 'returned' AND b.returned_date > b.expected_return_date) OR
                (b.status IN ('active', 'pending_return') AND b.expected_return_date < (NOW() AT TIME ZONE 'Asia/Bangkok')::date)
             ))::int AS late_count
      FROM users u
      LEFT JOIN borrowings b ON b.user_id = u.id
      GROUP BY u.id
      HAVING u.role <> 'admin' OR COUNT(b.id) > 0
      ORDER BY active_loans DESC, late_count DESC, total_loans DESC, u.name
    `;
    const loans = await sql`
      SELECT b.id, b.user_id, b.game_id, b.borrow_date, b.expected_return_date, b.returned_date, b.status,
             (COALESCE(b.returned_date, (NOW() AT TIME ZONE 'Asia/Bangkok')::date) - b.borrow_date) AS days,
             (b.expected_return_date - b.borrow_date) AS days_requested
      FROM borrowings b
      ORDER BY b.borrow_date DESC, b.id DESC
    `;
    res.json({ borrowers, loans });
  } catch (err) {
    console.error("Borrowers error:", err);
    res.status(500).json({ error: "Failed to fetch borrowers" });
  }
});

// ── Admin: SMS for overdue borrowings ────────────────────────

function overdueSmsText({ name, gameName, expectedReturnDate, daysOverdue }) {
  const d = String(expectedReturnDate).slice(0, 10).split("-").reverse().join("/");
  return `[Board Game Library] คุณ${name} กรุณาคืนเกม "${gameName}" ซึ่งเลยกำหนดคืน (${d}) มาแล้ว ${daysOverdue} วัน ขอบคุณค่ะ`;
}

app.post("/api/admin/borrowings/:id/sms", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [b] = await sql`
      SELECT b.id, b.game_id, b.expected_return_date, u.name, u.phone,
             ((NOW() AT TIME ZONE 'Asia/Bangkok')::date - b.expected_return_date) AS days_overdue
      FROM borrowings b JOIN users u ON u.id = b.user_id
      WHERE b.id = ${req.params.id} AND b.status = 'active'
    `;
    if (!b) return res.status(404).json({ error: "Active borrowing not found" });
    if (!b.phone) return res.status(400).json({ error: "Borrower has no phone number on file" });
    if (b.days_overdue <= 0) return res.status(400).json({ error: "Borrowing is not overdue" });

    const game = GAMES.find((g) => g.id === b.game_id);
    const message = overdueSmsText({
      name: b.name,
      gameName: game?.name || `#${b.game_id}`,
      expectedReturnDate: b.expected_return_date,
      daysOverdue: b.days_overdue,
    });

    if (!smsConfigured()) {
      return res.status(503).json({ code: "SMS_NOT_CONFIGURED", phone: b.phone, message });
    }
    await sendSms(b.phone, message);
    await sql`UPDATE borrowings SET last_sms_at = NOW() WHERE id = ${b.id}`;
    res.json({ sent: true, phone: b.phone });
  } catch (err) {
    console.error("SMS error:", err);
    res.status(502).json({ error: err.message || "Failed to send SMS" });
  }
});

// ── Automatic due-date reminders ─────────────────────────────

async function runReminders() {
  const dueSoon = await sql`
    SELECT b.id, b.game_id, b.expected_return_date, u.name, u.email
    FROM borrowings b JOIN users u ON u.id = b.user_id
    WHERE b.status = 'active' AND NOT COALESCE(b.due_soon_sent, FALSE)
      AND b.expected_return_date = (NOW() AT TIME ZONE 'Asia/Bangkok')::date + 1
  `;
  const overdue = await sql`
    SELECT b.id, b.game_id, b.expected_return_date, u.name, u.email,
           ((NOW() AT TIME ZONE 'Asia/Bangkok')::date - b.expected_return_date) AS days_overdue
    FROM borrowings b JOIN users u ON u.id = b.user_id
    WHERE b.status = 'active'
      AND b.expected_return_date < (NOW() AT TIME ZONE 'Asia/Bangkok')::date
      AND (b.last_overdue_notice IS NULL
           OR b.last_overdue_notice <= (NOW() AT TIME ZONE 'Asia/Bangkok')::date - 3)
  `;

  const result = { dueSoon: 0, overdue: 0, failed: 0 };
  const send = async (row, daysOverdue) => {
    const game = GAMES.find((g) => g.id === row.game_id);
    if (!row.email || !game) return false;
    try {
      await sendDueReminder({
        email: row.email,
        name: row.name,
        gameName: game.name,
        expectedReturnDate: row.expected_return_date,
        daysOverdue,
      });
      return true;
    } catch (err) {
      console.error("Reminder email error:", err);
      result.failed++;
      return false;
    }
  };

  for (const row of dueSoon) {
    if (await send(row, 0)) {
      await sql`UPDATE borrowings SET due_soon_sent = TRUE WHERE id = ${row.id}`;
      result.dueSoon++;
    }
  }
  for (const row of overdue) {
    if (await send(row, row.days_overdue)) {
      await sql`UPDATE borrowings SET last_overdue_notice = (NOW() AT TIME ZONE 'Asia/Bangkok')::date WHERE id = ${row.id}`;
      result.overdue++;
    }
  }
  return result;
}

app.get("/api/cron/reminders", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    res.json(await runReminders());
  } catch (err) {
    console.error("Cron reminders error:", err);
    res.status(500).json({ error: "Reminder run failed" });
  }
});

app.post("/api/admin/reminders/run", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await runReminders());
  } catch (err) {
    console.error("Manual reminders error:", err);
    res.status(500).json({ error: "Reminder run failed" });
  }
});

app.get("/api/admin/sms-status", requireAuth, requireAdmin, (req, res) => {
  res.json({ configured: smsConfigured() });
});

// ── Schema init (runs once) ──────────────────────────────────

let schemaReady = initSchema().catch((err) => {
  console.error("Failed to initialize database:", err);
});

app.use(async (req, res, next) => {
  await schemaReady;
  next();
});

export default app;

// ── Local dev server ─────────────────────────────────────────

const PORT = process.env.PORT || 3001;

if (process.env.VERCEL !== "1") {
  schemaReady.then(() => {
    app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
  });
}
