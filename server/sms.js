import "dotenv/config";

export function smsConfigured() {
  return !!(process.env.THAIBULKSMS_API_KEY && process.env.THAIBULKSMS_API_SECRET);
}

// Thai mobile numbers (0XXXXXXXXX) → 66XXXXXXXXX as ThaiBulkSMS expects.
export function toMsisdn(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.startsWith("0") ? `66${digits.slice(1)}` : digits;
}

export async function sendSms(phone, message) {
  if (!smsConfigured()) {
    const err = new Error("SMS provider not configured");
    err.code = "SMS_NOT_CONFIGURED";
    throw err;
  }
  const auth = Buffer.from(
    `${process.env.THAIBULKSMS_API_KEY}:${process.env.THAIBULKSMS_API_SECRET}`
  ).toString("base64");
  const body = new URLSearchParams({ msisdn: toMsisdn(phone), message });
  if (process.env.SMS_SENDER) body.set("sender", process.env.SMS_SENDER);

  const res = await fetch("https://api-v2.thaibulksms.com/sms", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SMS send failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}
