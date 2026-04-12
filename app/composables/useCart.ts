import { storeToRefs } from "pinia";
import { useCartStore } from "~/stores/cart";
import { isCustomerRole } from "~/composables/useCustomerRole";

/**
 * Composable giỏ hàng: đồng bộ DB khi đã đăng nhập (user/admin_3).
 * Khách: chỉ Pinia (giữ khi điều hướng trong SPA; mất khi F5 / đóng tab vì không lưu localStorage).
 */
export function useCart() {
  const store = useCartStore();
  const { cart } = storeToRefs(store);
  const roleCookie = process.client ? useCookie("user_role", { path: "/" }) : null;

  // Chỉ lưu giỏ trên DB khi đã đăng nhập (user). Khách: giỏ in-memory (Pinia), mất khi reload trang.
  // Lưu ý: không được gọi reset() khi khách điều hướng sang trang khác — mỗi lần mount gọi lại useCart();
  // trước đây `loadedFromServer === true` + khách → reset làm mất giỏ trước khi vào /cart.
  if (process.client) {
    const role = roleCookie?.value;
    if (!isCustomerRole(role)) {
      if (!store.loadedFromServer) {
        store.loadedFromServer = true;
      }
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
      if (isCustomerRole(role)) {
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
          const res: any = await $fetch("/api/cart/my");
          if (res?.success && Array.isArray(res.items)) {
            store.setItems(res.items);
          }
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
      if (isCustomerRole(role)) {
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
      if (isCustomerRole(role)) {
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
