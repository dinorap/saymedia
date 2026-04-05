/**
 * Kiểm tra tối thiểu (không cần DB): một số API nhạy cảm phải giới hạn admin_0.
 * Chạy: node --test scripts/audit-admin-routes.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("partner-affiliates chỉ cho admin_0", () => {
  const s = read("server/api/admin/partner-affiliates.get.ts");
  assert.ok(s.includes('currentUser.role !== "admin_0"'));
  assert.ok(!s.includes("requireAdmin(event)"));
});

test("ref_code đối tác bán hộ không trùng partner refs (partner.ts + product-sellers.post)", () => {
  const p = read("server/utils/partner.ts");
  assert.ok(p.includes("export async function refCodeExists"));
  const ps = read("server/api/admin/product-sellers.post.ts");
  assert.ok(ps.includes("refCodeExists"));
});

test("user-stats có scope shop (admin_2)", () => {
  const s = read("server/api/admin/user-stats.get.ts");
  assert.ok(s.includes("assertShopManagementRole"));
  assert.ok(s.includes("resolveShopAdminId"));
  assert.ok(s.includes("shopScopeId"));
});

test("partner-commission-payouts chỉ admin_0", () => {
  const s = read("server/api/admin/partner-commission-payouts.get.ts");
  assert.ok(s.includes("admin_0"));
});

test("credit-stats ledger có join users khi không phải super admin", () => {
  const s = read("server/api/admin/credit-stats.get.ts");
  assert.ok(s.includes("assertShopManagementRole"));
  assert.ok(s.includes("ledgerJoin"));
  assert.ok(s.includes("INNER JOIN users u ON u.id = l.user_id"));
});

test("announcements.post chỉ admin_0", () => {
  const s = read("server/api/admin/announcements.post.ts");
  assert.ok(s.includes('currentUser.role !== "admin_0"'));
});

test("assertShopManagementRole chặn admin_support trên API quản lý shop", () => {
  const h = read("server/utils/authHelpers.ts");
  assert.ok(h.includes("assertShopManagementRole"));
  assert.ok(h.includes("admin_support"));
  const orders = read("server/api/admin/orders.get.ts");
  assert.ok(orders.includes("assertShopManagementRole"));
  const ledger = read("server/api/admin/credit-ledger.get.ts");
  assert.ok(ledger.includes("assertShopManagementRole"));
  const dash = read("server/api/admin/dashboard-stats.get.ts");
  assert.ok(dash.includes("assertShopManagementRole"));
  const rev = read("server/api/admin/revenue-summary.get.ts");
  assert.ok(rev.includes("assertShopManagementRole"));
  const earn = read("server/api/admin/earnings/summary.get.ts");
  assert.ok(earn.includes("assertShopManagementRole"));
  const ps = read("server/api/admin/product-sellers.get.ts");
  assert.ok(ps.includes("assertShopManagementRole"));
  const upload = read("server/api/admin/upload/product-image.post.ts");
  assert.ok(upload.includes("assertShopManagementRole"));
  const contact = read("server/api/admin/profile/contact.post.ts");
  assert.ok(contact.includes("assertShopManagementRole"));
});

test("đơn refund/put dùng assertOrderVisibleToShopAdmin (khớp orders.get)", () => {
  const h = read("server/utils/adminHierarchy.ts");
  assert.ok(h.includes("assertOrderVisibleToShopAdmin"));
  const refund = read("server/api/admin/orders/[id]/refund.post.ts");
  assert.ok(refund.includes("assertOrderVisibleToShopAdmin"));
  const put = read("server/api/admin/orders/[id].put.ts");
  assert.ok(put.includes("assertOrderVisibleToShopAdmin"));
});

test("support threads.get: admin_2 lọc shop hoặc chính mình (khớp canAdminAccessSupportThread)", () => {
  const s = read("server/api/support/threads.get.ts");
  assert.ok(s.includes("(st.admin_id = ? OR st.admin_id = ?)"));
  assert.ok(s.includes("listParams.unshift(shopId, current.id)"));
});

test("support: admin_1 thấy thread cấp dưới (khớp canAdminAccessSupportThread)", () => {
  const s = read("server/api/support/threads.get.ts");
  assert.ok(s.includes("current.role === \"admin_1\""));
  assert.ok(s.includes("parent_admin_id"));
  const h = read("server/utils/adminHierarchy.ts");
  assert.ok(h.includes("parent_admin_id"));
  assert.ok(h.includes("role === \"admin_support\""));
});

test("support threads.get: admin_0 không lọc st.admin_id = super admin (list đầy đủ)", () => {
  const s = read("server/api/support/threads.get.ts");
  assert.ok(s.includes('current.role === "admin_0"'));
  assert.ok(s.includes("listFilter = \"1=1\""));
});

test("recent-orders.post: không mở nặc danh (chỉ admin_0)", () => {
  const s = read("server/api/recent-orders.post.ts");
  assert.ok(s.includes("requireAuth"));
  assert.ok(s.includes("admin_0"));
});

test("admins delete: chặn xóa chính mình + DELETE dùng numId", () => {
  const s = read("server/api/admin/admins/[id].delete.ts");
  assert.ok(s.includes("Không thể xóa chính tài khoản đang đăng nhập"));
  assert.ok(s.includes("DELETE FROM admins WHERE id = ?"));
  assert.ok(s.includes("[numId]"));
});

test("admins put: chặn tự khóa / khóa Super Admin gốc (is_active)", () => {
  const s = read("server/api/admin/admins/[id].put.ts");
  assert.ok(s.includes("Không thể khóa tài khoản Super Admin gốc"));
  assert.ok(s.includes("Không thể tự khóa tài khoản đang đăng nhập"));
  assert.ok(s.includes("params.push(numId)"));
});

test("forgot-password: rate limit + không lộ email + đổi mật khẩu sau khi gửi mail thành công", () => {
  const s = read("server/api/auth/forgot-password.post.ts");
  assert.ok(s.includes("checkRateLimit"));
  assert.ok(s.includes("GENERIC_SUCCESS_MESSAGE"));
  assert.ok(s.includes("sendNewPasswordEmail"));
  assert.ok(s.indexOf("bcrypt.hash") < s.indexOf("UPDATE users SET password_hash"));
});

test("send-otp-login: không trả lỗi riêng khi email chưa đăng ký (enumeration)", () => {
  const s = read("server/api/auth/send-otp-login.post.ts");
  assert.ok(s.includes("GENERIC_OTP_MESSAGE"));
  assert.ok(s.includes("users.length === 0"));
  assert.ok(!s.includes("Email chưa được đăng ký"));
});

test("login OTP: không lộ Email chưa đăng ký ở bước xác thực", () => {
  const s = read("server/api/auth/login.post.ts");
  assert.ok(!s.includes("Email chưa đăng ký!"));
});

test("đăng ký: resolveAssigneeAdminId — admin ref phải active (FK users.admin_id)", () => {
  const u = read("server/utils/registerAssignee.ts");
  assert.ok(u.includes("resolveAssigneeAdminId"));
  assert.ok(u.includes("is_active = 1"));
  assert.ok(read("server/api/auth/register.post.ts").includes("resolveAssigneeAdminId"));
  assert.ok(read("server/api/auth/register/send-otp.post.ts").includes("resolveAssigneeAdminId"));
  assert.ok(read("server/api/auth/register/verify.post.ts").includes("resolveAssigneeAdminId"));
});
