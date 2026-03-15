const REF_PREFIX = "ref_product_";
const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

type StoredProductRef = {
  ref: string;
  time: number;
};

function getStorageKey(productId: number | string) {
  return `${REF_PREFIX}${String(productId)}`;
}

export function setProductRef(productId: number | string, ref: string) {
  if (!import.meta.client) return;
  const trimmed = String(ref || "").trim();
  if (!trimmed) return;
  try {
    const payload: StoredProductRef = {
      ref: trimmed,
      time: Date.now(),
    };
    localStorage.setItem(getStorageKey(productId), JSON.stringify(payload));
  } catch {
    // ignore storage error
  }
}

export function getProductRef(productId: number | string): string | null {
  if (!import.meta.client) return null;
  try {
    const raw = localStorage.getItem(getStorageKey(productId));
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredProductRef;
    if (!data?.ref || !data?.time) {
      return null;
    }
    const age = Date.now() - Number(data.time);
    if (!Number.isFinite(age) || age < 0 || age > REF_TTL_MS) {
      // Hết hạn → xóa luôn
      localStorage.removeItem(getStorageKey(productId));
      return null;
    }
    return String(data.ref);
  } catch {
    return null;
  }
}

