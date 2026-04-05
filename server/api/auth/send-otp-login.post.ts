import pool from "../../utils/db";
import { setOtp } from "../../utils/otpStore";
import { enqueueOtpEmail } from "../../utils/emailQueue";
import { checkOtpRateLimit } from "../../utils/otpRateLimit";

/** Cùng nội dung dù có gửi OTP hay không — tránh lộ email có/không trong DB. */
const GENERIC_OTP_MESSAGE =
  "Nếu email đã đăng ký trong hệ thống, bạn sẽ nhận mã OTP (kiểm tra cả hộp thư rác).";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const email = body?.email?.trim();

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: "Vui lòng nhập email!" });
  }

  checkOtpRateLimit(event, email);

  const [users]: any = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (users.length === 0) {
    return { success: true, message: GENERIC_OTP_MESSAGE };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  setOtp(email, code);
  enqueueOtpEmail(email, code, "đăng nhập");
  return { success: true, message: GENERIC_OTP_MESSAGE };
});
