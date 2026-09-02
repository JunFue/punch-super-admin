/**
 * SMS Notification Service for Super Admin
 * Supports Semaphore (Philippine SMS Gateway), Twilio, PhilSMS, and development fallback.
 */

export interface SendSmsParams {
  to?: string;
  message: string;
  senderName?: string;
}

export interface SendSmsResult {
  success: boolean;
  provider: string;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

export function formatPhoneNumber(phone: string, format: "local" | "e164" = "local"): string {
  let cleaned = phone.replace(/[^\d+]/g, "");

  if (format === "local") {
    if (cleaned.startsWith("+63")) {
      cleaned = "0" + cleaned.slice(3);
    } else if (cleaned.startsWith("63") && cleaned.length === 12) {
      cleaned = "0" + cleaned.slice(2);
    }
    return cleaned;
  } else {
    if (cleaned.startsWith("09")) {
      cleaned = "+63" + cleaned.slice(1);
    } else if (cleaned.startsWith("9") && cleaned.length === 10) {
      cleaned = "+63" + cleaned;
    } else if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }
    return cleaned;
  }
}

export async function sendSms({ to, message, senderName }: SendSmsParams): Promise<SendSmsResult> {
  const recipient = to || process.env.ADMIN_PHONE_NUMBER || process.env.PERSONAL_PHONE_NUMBER || "09097215229";
  const provider = (process.env.SMS_PROVIDER || "semaphore").toLowerCase();

  // 1. Semaphore API
  if (provider === "semaphore") {
    const apiKey = process.env.SEMAPHORE_API_KEY || process.env.SMS_API_KEY;
    const localNumber = formatPhoneNumber(recipient, "local");
    const sender = senderName || process.env.SEMAPHORE_SENDER_NAME;

    if (!apiKey) {
      console.log("ℹ️ [SMS Semaphore Mock] (No SEMAPHORE_API_KEY configured):");
      console.log(`📱 To: ${localNumber}`);
      console.log(`💬 Message:\n${message}\n`);
      return {
        success: true,
        provider: "semaphore (simulated)",
        simulated: true,
      };
    }

    try {
      const payload: Record<string, string> = {
        apikey: apiKey,
        number: localNumber,
        message,
      };
      if (sender) payload.sendername = sender;

      const response = await fetch("https://api.semaphore.co/api/v4/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(payload).toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Semaphore SMS error:", data);
        return {
          success: false,
          provider: "semaphore",
          error: Array.isArray(data) ? data[0]?.message : JSON.stringify(data),
        };
      }

      console.log("✅ SMS sent via Semaphore to:", localNumber);
      return {
        success: true,
        provider: "semaphore",
        messageId: Array.isArray(data) ? data[0]?.message_id?.toString() : undefined,
      };
    } catch (err: any) {
      console.error("Semaphore dispatch failed:", err.message);
      return { success: false, provider: "semaphore", error: err.message };
    }
  }

  // 2. Twilio API
  if (provider === "twilio") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const e164Number = formatPhoneNumber(recipient, "e164");

    if (!accountSid || !authToken || !fromNumber) {
      console.log("ℹ️ [SMS Twilio Mock] (Missing Twilio credentials):");
      console.log(`📱 To: ${e164Number}`);
      console.log(`💬 Message:\n${message}\n`);
      return {
        success: true,
        provider: "twilio (simulated)",
        simulated: true,
      };
    }

    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({
          To: e164Number,
          From: fromNumber,
          Body: message,
        }).toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, provider: "twilio", error: data.message || response.statusText };
      }

      console.log("✅ SMS sent via Twilio to:", e164Number);
      return { success: true, provider: "twilio", messageId: data.sid };
    } catch (err: any) {
      console.error("Twilio dispatch failed:", err.message);
      return { success: false, provider: "twilio", error: err.message };
    }
  }

  // Fallback logger
  console.log(`ℹ️ [SMS Log] To: ${recipient}\n${message}`);
  return { success: true, provider: "mock", simulated: true };
}

/**
 * Notify store owner when subscription is activated / approved
 */
export async function sendSubscriptionApprovedSms({
  storeName,
  recipientPhone,
  planType,
  expiryDate,
}: {
  storeName: string;
  recipientPhone: string;
  planType: string;
  expiryDate: string;
}): Promise<SendSmsResult> {
  const message = `[PUNCH POS] 🎉 Congratulations! Your ${planType.toUpperCase()} subscription for ${storeName} has been APPROVED!\nValid until: ${expiryDate}.\nThank you for choosing PUNCH POS!`;

  return await sendSms({
    to: recipientPhone,
    message: message.trim(),
  });
}
