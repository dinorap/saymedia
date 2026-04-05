import bcrypt from "bcryptjs";
import pool from "../../utils/db";
import { sendNewPasswordEmail } from "../../utils/email";
import { getRequestIpKey } from "../../utils/authHelpers";
import { checkRateLimit, rateLimitKey } from "../../utils/rateLimit";

/** Trả cùng một thông điệp dù email có trong DB hay không — chống lộ danh sách email. */
const GENERIC_SUCCESS_MESSAGE =
  "Nếu email đã đăng ký trong hệ thống, bạn sẽ nhận email chứa mật khẩu mới (kiểm tra cả hộp thư rác).";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const email = body?.email?.trim();

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: "Vui lòng nhập email!" });
  }

  const emailNorm = String(email).toLowerCase().slice(0, 320);
  checkRateLimit({
    key: rateLimitKey(["forgot_password", getRequestIpKey(event), emailNorm]),
    max: 5,
    windowMs: 15 * 60 * 1000,
    statusMessage: "Yêu cầu quá nhiều. Vui lòng thử lại sau ít phút.",
    auditAction: "rate_limited_forgot_password",
    auditMetadata: { email_domain: emailNorm.includes("@") ? emailNorm.split("@")[1] : "" },
  });

  const [users]: any = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (users.length === 0) {
    return { success: true, message: GENERIC_SUCCESS_MESSAGE };
  }

  const newPassword = Math.random().toString(36).slice(-10);
  const sent = await sendNewPasswordEmail(email, newPassword);
  if (!sent) {
    throw createError({
      statusCode: 500,
      statusMessage: "Không gửi được email. Vui lòng thử lại!",
    });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password_hash = ? WHERE email = ?", [hashedPassword, email]);

  return { success: true, message: GENERIC_SUCCESS_MESSAGE };
});
