/** Khách hàng thường hoặc đối tác giới thiệu (admin_3) — cùng quyền mua/nạp/giỏ. */
export function isCustomerRole(role: string | null | undefined): boolean {
  return role === "user" || role === "admin_3";
}
