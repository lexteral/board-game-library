import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER;

function fmtDate(d) {
  if (!d) return "-";
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, day] = d.slice(0, 10).split("-");
    return `${day}/${m}/${y}`;
  }
  const date = new Date(d);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export async function sendBorrowConfirmation({ email, name, gameName, borrowDate, expectedReturnDate }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  await transporter.sendMail({
    from: `"Board Game Library 🎲" <${FROM}>`,
    to: email,
    subject: `Borrowing Confirmed: ${gameName}`,
    html: `
      <div style="font-family:'Sarabun',sans-serif;max-width:480px;margin:0 auto;padding:24px;background:linear-gradient(135deg,#f5f3ff,#fefce8);border-radius:16px">
        <h2 style="color:#7c3aed;margin:0 0 16px">🎲 Borrowing Confirmed</h2>
        <p>สวัสดีค่ะ/ครับ <strong>${name}</strong>,</p>
        <p>You have successfully borrowed:</p>
        <div style="background:#fff;border:1px solid #ddd6fe;border-radius:12px;padding:16px;margin:12px 0">
          <p style="margin:0;font-size:18px;font-weight:bold;color:#6d28d9">${gameName}</p>
          <p style="margin:8px 0 0;color:#666;font-size:14px">
            📅 Borrow Date: <strong>${fmtDate(borrowDate)}</strong><br/>
            📅 Expected Return: <strong>${fmtDate(expectedReturnDate)}</strong>
          </p>
        </div>
        <p style="color:#666;font-size:14px">Please return the game by the expected return date. Thank you!</p>
        <hr style="border:none;border-top:1px solid #ddd6fe;margin:16px 0"/>
        <p style="color:#999;font-size:12px;margin:0">Board Game Library — English Teaching Department, School of Education, WU</p>
      </div>
    `,
  });
}

export async function sendDueReminder({ email, name, gameName, expectedReturnDate, daysOverdue }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const overdue = daysOverdue > 0;
  const color = overdue ? "#ED438B" : "#F58220";
  const subject = overdue
    ? `Overdue (${daysOverdue} day${daysOverdue > 1 ? "s" : ""}): ${gameName}`
    : `Due tomorrow: ${gameName}`;
  const headline = overdue ? "⏰ This game is overdue" : "📅 Return reminder";
  const thai = overdue
    ? `เกมนี้เลยกำหนดคืนมาแล้ว ${daysOverdue} วัน กรุณานำมาคืนโดยเร็วที่สุด`
    : "กรุณานำเกมมาคืนภายในวันพรุ่งนี้";
  const eng = overdue
    ? `This game is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} past its return date. Please return it as soon as possible.`
    : "Friendly reminder: this game is due back tomorrow.";

  await transporter.sendMail({
    from: `"Board Game Library 🎲" <${FROM}>`,
    to: email,
    subject,
    html: `
      <div style="font-family:'Sarabun',sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#FFFDF9;border-radius:16px">
        <h2 style="color:${color};margin:0 0 16px">${headline}</h2>
        <p>สวัสดีค่ะ/ครับ <strong>${name}</strong>,</p>
        <div style="background:#fff;border:2px solid #F2F0EB;border-radius:12px;padding:16px;margin:12px 0">
          <p style="margin:0;font-size:18px;font-weight:bold;color:#242422">${gameName}</p>
          <p style="margin:8px 0 0;color:#666;font-size:14px">
            📅 Expected Return: <strong>${fmtDate(expectedReturnDate)}</strong>
          </p>
        </div>
        <p style="color:#444;font-size:14px">${thai}<br/>${eng}</p>
        <hr style="border:none;border-top:1px solid #F2F0EB;margin:16px 0"/>
        <p style="color:#999;font-size:12px;margin:0">Board Game Library — English Teaching Department, School of Education, WU</p>
      </div>
    `,
  });
}

export async function sendReturnSubmitted({ email, name, gameName }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  await transporter.sendMail({
    from: `"Board Game Library 🎲" <${FROM}>`,
    to: email,
    subject: `Return Received: ${gameName}`,
    html: `
      <div style="font-family:'Sarabun',sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#FFFDF9;border-radius:16px">
        <h2 style="color:#2459E8;margin:0 0 16px">📦 Return Received</h2>
        <p>สวัสดีค่ะ/ครับ <strong>${name}</strong>,</p>
        <div style="background:#fff;border:2px solid #F2F0EB;border-radius:12px;padding:16px;margin:12px 0">
          <p style="margin:0;font-size:18px;font-weight:bold;color:#242422">${gameName}</p>
        </div>
        <p style="color:#444;font-size:14px">ระบบได้รับการคืนเกมของคุณแล้ว กำลังรอผู้ดูแลตรวจสอบ<br/>We received your return. An admin will check the game and confirm shortly.</p>
        <hr style="border:none;border-top:1px solid #F2F0EB;margin:16px 0"/>
        <p style="color:#999;font-size:12px;margin:0">Board Game Library — English Teaching Department, School of Education, WU</p>
      </div>
    `,
  });
}

export async function sendReturnApprovalConfirmation({ email, name, gameName, returnedDate }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  await transporter.sendMail({
    from: `"Board Game Library 🎲" <${FROM}>`,
    to: email,
    subject: `Return Approved: ${gameName}`,
    html: `
      <div style="font-family:'Sarabun',sans-serif;max-width:480px;margin:0 auto;padding:24px;background:linear-gradient(135deg,#f5f3ff,#fefce8);border-radius:16px">
        <h2 style="color:#059669;margin:0 0 16px">✅ Return Approved</h2>
        <p>สวัสดีค่ะ/ครับ <strong>${name}</strong>,</p>
        <p>Your return has been approved by the admin:</p>
        <div style="background:#fff;border:1px solid #d1fae5;border-radius:12px;padding:16px;margin:12px 0">
          <p style="margin:0;font-size:18px;font-weight:bold;color:#059669">${gameName}</p>
          <p style="margin:8px 0 0;color:#666;font-size:14px">
            📅 Returned Date: <strong>${fmtDate(returnedDate)}</strong>
          </p>
        </div>
        <p style="color:#666;font-size:14px">Thank you for returning the game! ขอบคุณค่ะ/ครับ</p>
        <hr style="border:none;border-top:1px solid #ddd6fe;margin:16px 0"/>
        <p style="color:#999;font-size:12px;margin:0">Board Game Library — English Teaching Department, School of Education, WU</p>
      </div>
    `,
  });
}
