import { storeToRefs } from "pinia";
import { useCartStore } from "~/stores/cart";

/**
 * Composable giỏ hàng: chỉ lưu DB (user đã đăng nhập). Khách không đăng nhập: giỏ in-memory, mất khi tải lại trang.
 */
export function useCart() {
  const store = useCartStore();
  const { cart } = storeToRefs(store);
  const roleCookie = process.client ? useCookie("user_role", { path: "/" }) : null;

  // Chỉ lưu giỏ trên DB khi đã đăng nhập (user). Khách: giỏ in-memory, mất khi reload.
  if (process.client) {
    const role = roleCookie?.value;
    if (role !== "user") {
      if (store.loadedFromServer) store.reset();
      else store.loadedFromServer = true;
    } else if (!store.loadedFromServer) {
      $fetch("/api/cart/my")
        .then((res: any) => {
          if (res?.success && Array.isArray(res.items)) {
            store.setItems(res.items);
          } else {
            store.loadedFromServer = true;
          }
        })
        .catch(() => {
          store.loadedFromServer = true;
        });
    }
  }

  async function addAndSync(
    product: {
      id: number;
      name?: string;
      price?: number;
      thumbnail_url?: string | null;
      type?: string | null;
    },
    options?: {
      qty?: number;
      duration?: string | null;
    },
  ) {
    const payload: any = {
      ...product,
    };

    if (options?.qty != null) {
      payload.qty = options.qty;
    }
    if (options?.duration != null) {
      payload.duration = options.duration;
    }

    store.add(payload);
    if (process.client) {
      const role = useCookie("user_role", { path: "/" }).value;
      if (role === "user") {
        try {
          const qty =
            options?.qty != null && Number.isFinite(options.qty)
              ? Math.max(1, Math.min(100, Number(options.qty)))
              : 1;
          await $fetch("/api/cart/add", {
            method: "POST",
            body: {
              product_id: product.id,
              qty,
              duration: options?.duration ?? null,
            },
          });
        } catch {
          // ignore sync error, local cart vẫn hoạt động
        }
      }
    }
  }

  async function removeAndSync(id: number, duration?: string | null) {
    store.remove(id, duration);
    if (process.client) {
      const role = useCookie("user_role", { path: "/" }).value;
      if (role === "user") {
        try {
          await $fetch("/api/cart/remove", {
            method: "POST",
            body: { product_id: id, duration: duration ?? null },
          });
        } catch {
          // ignore
        }
      }
    }
  }

  async function clearAndSync() {
    store.clear();
    if (process.client) {
      const role = useCookie("user_role", { path: "/" }).value;
      if (role === "user") {
        try {
          await $fetch("/api/cart/clear", { method: "POST" });
        } catch {
          // ignore
        }
      }
    }
  }

  return {
    cart,
    add: addAndSync,
    remove: removeAndSync,
    clear: clearAndSync,
    count: computed(() => store.count),
    total: computed(() => store.total),
  };
}
