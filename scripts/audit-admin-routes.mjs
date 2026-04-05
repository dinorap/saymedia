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

test("user-stats có scope shop (admin_2)", () => {
  const s = read("server/api/admin/user-stats.get.ts");
  assert.ok(s.includes("resolveShopAdminId"));
  assert.ok(s.includes("shopScopeId"));
});

test("partner-commission-payouts chỉ admin_0", () => {
  const s = read("server/api/admin/partner-commission-payouts.get.ts");
  assert.ok(s.includes("admin_0"));
});

test("credit-stats ledger có join users khi không phải super admin", () => {
  const s = read("server/api/admin/credit-stats.get.ts");
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
});
