import { VALID_KEY_DURATIONS } from "./productKeys";

/** Lấy số nguyên VNĐ từ chuỗi kiểu "1.900.000 VNĐ" → 1900000 */
export function parseVndStringToInteger(s: string): number {
  const digits = String(s || "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.trunc(n), 9_999_999_999_999);
}

export function vndIntegerToCredits(vnd: number, vndPerCredit: number): number {
  const rate = Number(vndPerCredit);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  if (!Number.isFinite(vnd) || vnd <= 0) return 0;
  return Math.max(1, Math.round(vnd / rate));
}

export function mapDaysToKeyDuration(days: number): string | null {
  const n = Math.trunc(Number(days));
  if (!Number.isFinite(n) || n <= 0) return null;
  const key = `${n}d`;
  return (VALID_KEY_DURATIONS as readonly string[]).includes(key) ? key : null;
}

export type YoutubePricingBundleInput = {
  pricing_type: "youtube_long_video";
  package_index: number;
  sub_package_index: number;
};

/**
 * Đối chiếu bảng giá YouTube + chỉ số gói → duration key, số key, điểm combo.
 * Ném Error nếu cấu hình thiếu / không khớp sản phẩm.
 */
export function resolveYoutubePricingCombo(
  pricingData: Record<string, unknown> | null | undefined,
  bundle: YoutubePricingBundleInput,
  requestProductId: number,
  vndPerCredit: number,
): {
  duration: string;
  quantity: number;
  comboCredits: number;
  parentName: string;
  subName: string;
  vndParsed: number;
  linkedProductId: number;
} {
  const d = pricingData && typeof pricingData === "object" ? pricingData : {};
  const pkgs = Array.isArray((d as any).packages) ? (d as any).packages : [];
  const pkg = pkgs[bundle.package_index];
  if (!pkg || typeof pkg !== "object") {
    throw new Error("Gói báo giá không hợp lệ");
  }
  const subs = Array.isArray((pkg as any).subPackages) ? (pkg as any).subPackages : [];
  const sub = subs[bundle.sub_package_index];
  if (!sub || typeof sub !== "object") {
    throw new Error("Tuỳ chọn gói (combo) không hợp lệ");
  }

  const subLinked =
    (sub as any).linkedProductId != null && Number((sub as any).linkedProductId) > 0
      ? Math.trunc(Number((sub as any).linkedProductId))
      : null;
  const rootLinked =
    (d as any).linkedProductId != null && Number((d as any).linkedProductId) > 0
      ? Math.trunc(Number((d as any).linkedProductId))
      : null;
  const linkedProductId = subLinked ?? rootLinked;
  if (!linkedProductId) {
    throw new Error(
      "Bảng giá YouTube chưa gắn sản phẩm (admin: Bảng giá → Tool YouTube → Sản phẩm combo)",
    );
  }
  if (Math.trunc(Number(requestProductId)) !== linkedProductId) {
    throw new Error("Sản phẩm không khớp với gói combo đã chọn");
  }

  const kd = String((sub as any).keyDuration || "").trim();
  let duration: string | null = null;
  if (kd && (VALID_KEY_DURATIONS as readonly string[]).includes(kd as any)) {
    duration = kd;
  } else {
    const days = Math.trunc(Number((sub as any).days ?? 0));
    duration = mapDaysToKeyDuration(days);
  }
  if (!duration) {
    throw new Error(
      `Chưa chọn loại key hợp lệ (chọn trong admin hoặc map số ngày: ${VALID_KEY_DURATIONS.join(", ")})`,
    );
  }

  let quantity = Math.trunc(Number((sub as any).device ?? 0));
  if (!Number.isFinite(quantity) || quantity <= 0) quantity = 1;
  quantity = Math.min(100, Math.max(1, quantity));

  const vndParsed = parseVndStringToInteger(String((sub as any).price ?? ""));
  const comboCredits = vndIntegerToCredits(vndParsed, vndPerCredit);
  if (!comboCredits || comboCredits <= 0) {
    throw new Error("Không quy đổi được giá combo (VNĐ → điểm). Kiểm tra cột Giá trong bảng giá.");
  }

  return {
    duration,
    quantity,
    comboCredits,
    parentName: String((pkg as any).planName || ""),
    subName: String((sub as any).planName || ""),
    vndParsed,
    linkedProductId,
  };
}
