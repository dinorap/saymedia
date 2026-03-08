import { defineStore } from "pinia";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  thumbnail_url: string | null;
  type: string | null;
  qty: number;
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
    }) {
      if (!product?.id) return;
      const existing = this.items.find((p) => p.id === product.id);
      if (existing) return;
      this.items.push({
        id: product.id,
        name: product.name ?? "",
        price: Number(product.price ?? 0),
        thumbnail_url: product.thumbnail_url ?? null,
        type: product.type ?? null,
        qty: 1,
      });
    },
    remove(id: number) {
      this.items = this.items.filter((p) => p.id !== id);
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
