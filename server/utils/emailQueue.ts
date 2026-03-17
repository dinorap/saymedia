import { addAuditLog } from "./audit";
import { deleteOtp } from "./otpStore";
import { sendOtpEmail, isEmailConfigured } from "./email";

type OtpPurpose = "đăng ký" | "đăng nhập";

type EmailJob =
  | {
      kind: "otp";
      to: string;
      otpCode: string;
      purpose: OtpPurpose;
      createdAt: number;
      attempt: number;
    };

const queue: EmailJob[] = [];
let running = false;

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [0, 1500, 4000];

function safeEmailKey(email: string) {
  return String(email || "").toLowerCase().trim();
}

async function processJob(job: EmailJob) {
  if (job.kind === "otp") {
    const ok = await sendOtpEmail(job.to, job.otpCode, job.purpose);
    if (ok) {
      await addAuditLog({
        actorType: "system",
        action: "otp_email_sent",
        targetType: "email",
        targetId: safeEmailKey(job.to),
        metadata: { purpose: job.purpose, attempt: job.attempt },
      });
      return true;
    }
    return false;
  }
  return false;
}

async function workerLoop() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const job = queue.shift()!;
      const attempt = Math.min(job.attempt, MAX_ATTEMPTS);
      const delay =
        RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)] || 0;
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }

      let ok = false;
      try {
        ok = await processJob(job);
      } catch (e: any) {
        ok = false;
      }

      if (!ok) {
        if (job.attempt < MAX_ATTEMPTS) {
          queue.push({ ...job, attempt: job.attempt + 1 });
          continue;
        }
        // final failure: remove OTP so user isn't stuck with an OTP they never received
        if (job.kind === "otp") {
          deleteOtp(job.to);
          await addAuditLog({
            actorType: "system",
            action: "otp_email_failed",
            targetType: "email",
            targetId: safeEmailKey(job.to),
            metadata: { purpose: job.purpose },
          }).catch(() => {});
        }
      }
    }
  } finally {
    running = false;
  }
}

export function enqueueOtpEmail(to: string, otpCode: string, purpose: OtpPurpose) {
  if (!isEmailConfigured()) {
    throw createError({
      statusCode: 500,
      statusMessage: "Chưa cấu hình email gửi OTP",
    });
  }
  queue.push({
    kind: "otp",
    to: String(to || "").trim(),
    otpCode: String(otpCode || "").trim(),
    purpose,
    createdAt: Date.now(),
    attempt: 1,
  });
  // fire-and-forget
  setTimeout(() => {
    workerLoop().catch(() => {});
  }, 0);
}

