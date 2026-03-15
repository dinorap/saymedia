import { defineStore } from "pinia";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  thumbnail_url: string | null;
  type: string | null;
  qty: number;
  /** Loại key (thời lượng) người dùng chọn, ví dụ: "2h", "1d", "30d" */
  duration?: string | null;
  /** Bảng giá theo loại key, ví dụ: { "2h": 1000, "1d": 5000 } */
  duration_prices?: Record<string, number>;
  /** Số key còn theo từng duration (từ API cart/my), ví dụ: { "2h": 30, "12h": 12 } */
  duration_stock?: Record<string, number>;
}

export const useCartStore = defineStore("cart", {
  state: () => ({
    items: [] as CartItem[],
    loadedFromServer: false,
  }),

  getters: {
    cart: (state) => state.items,
    count: (state) => state.items.length,
    total: (state) =>
      state.items.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
        0
      ),
  },

  actions: {
    setItems(items: CartItem[]) {
      this.items = items;
      this.loadedFromServer = true;
    },
    add(product: {
      id: number;
      name?: string;
      price?: number;
      thumbnail_url?: string | null;
      type?: string | null;
      qty?: number;
      duration?: string | null;
    }) {
      if (!product?.id) return;

      const duration = product.duration ?? null;
      let qty = Number(product.qty ?? 1);
      if (!Number.isFinite(qty) || qty <= 0) qty = 1;
      if (qty > 100) qty = 100;

      const existing = this.items.find(
        (p) => p.id === product.id && (p.duration ?? null) === duration,
      );
      if (existing) {
        existing.qty = qty;
        return;
      }

      this.items.push({
        id: product.id,
        name: product.name ?? "",
        price: Number(product.price ?? 0),
        thumbnail_url: product.thumbnail_url ?? null,
        type: product.type ?? null,
        qty,
        duration,
      });
    },
    /** Xóa một dòng giỏ: theo id + duration để không xóa nhầm sản phẩm cùng id khác loại key. */
    remove(id: number, duration?: string | null) {
      const d = duration ?? null;
      this.items = this.items.filter(
        (p) => !(p.id === id && (p.duration ?? null) === d),
      );
    },
    clear() {
      this.items = [];
    },
    /** Gọi khi đăng xuất: xóa giỏ in-memory và cho phép load lại từ DB khi đăng nhập lại. */
    reset() {
      this.items = [];
      this.loadedFromServer = false;
    },
  },
});
