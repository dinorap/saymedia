/**
 * Gửi email OTP / mật khẩu mới qua Gmail SMTP
 * Config: process.env.EMAIL_SENDER + EMAIL_APP_PASSWORD hoặc server/email_config.json
 */
import nodemailer from 'nodemailer'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

let transporter: nodemailer.Transporter | null = null

function getConfig(): { sender: string; password: string } | null {
  const sender = process.env.EMAIL_SENDER
  const password = process.env.EMAIL_APP_PASSWORD
  if (sender && password) return { sender, password }
  try {
    const path = join(process.cwd(), 'server', 'email_config.json')
    if (existsSync(path)) {
      const raw = readFileSync(path, 'utf-8')
      const config = JSON.parse(raw) as { sender?: string; password?: string }
      if (config.sender && config.password) return { sender: config.sender, password: config.password }
    }
  } catch {
    // ignore
  }
  return null
}

function getTransporter() {
  if (transporter) return transporter
  const config = getConfig()
  if (!config) {
    console.warn('[email] Chưa cấu hình EMAIL_SENDER/EMAIL_APP_PASSWORD hoặc server/email_config.json')
    return null
  }
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: config.sender, pass: config.password }
  })
  return transporter
}

export async function sendOtpEmail(
  to: string,
  otpCode: string,
  purpose: 'đăng ký' | 'đăng nhập'
): Promise<boolean> {
  const trans = getTransporter()
  if (!trans) return false
  const subject = `Mã OTP ${purpose === 'đăng ký' ? 'Đăng ký' : 'Đăng nhập'} - Tạp Hóa MMO`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0d1220;">Mã OTP ${purpose === 'đăng ký' ? 'Đăng ký' : 'Đăng nhập'}</h2>
      <p>Xin chào,</p>
      <p>Bạn đang thực hiện ${purpose} tài khoản. Mã OTP của bạn:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="background: #00d4ff; color: #0a0e17; padding: 12px 24px; border-radius: 8px; font-size: 22px; font-weight: bold; letter-spacing: 4px;">${otpCode}</span>
      </div>
      <p><strong>Mã có hiệu lực trong 5 phút.</strong></p>
      <p style="color: #666; font-size: 12px;">Email tự động, vui lòng không trả lời.</p>
    </div>
  `
  try {
    await trans.sendMail({
      from: getConfig()!.sender,
      to,
      subject,
      html
    })
    return true
  } catch (e) {
    console.error('[email] sendOtp:', e)
    return false
  }
}

export async function sendNewPasswordEmail(to: string, newPassword: string): Promise<boolean> {
  const trans = getTransporter()
  if (!trans) return false
  const subject = 'Mật khẩu mới - Tạp Hóa MMO'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0d1220;">Mật khẩu mới</h2>
      <p>Xin chào,</p>
      <p>Bạn đã yêu cầu đặt lại mật khẩu. Mật khẩu mới của bạn:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="background: #27ae60; color: #fff; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-family: monospace;">${newPassword}</span>
      </div>
      <p><strong>Vui lòng đăng nhập và đổi mật khẩu sau khi sử dụng.</strong></p>
      <p style="color: #e74c3c;"><strong>Không chia sẻ email này với ai.</strong></p>
      <p style="color: #666; font-size: 12px;">Email tự động, vui lòng không trả lời.</p>
    </div>
  `
  try {
    await trans.sendMail({
      from: getConfig()!.sender,
      to,
      subject,
      html
    })
    return true
  } catch (e) {
    console.error('[email] sendNewPassword:', e)
    return false
  }
}
