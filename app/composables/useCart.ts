export function useCart() {
  const cart = useState<any[]>("cart", () => []);

  if (process.client) {
    const initialized = useState<boolean>("cart_init", () => false);
    if (!initialized.value) {
      try {
        const raw = localStorage.getItem("cart");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            cart.value = parsed;
          }
        }
      } catch {
        cart.value = [];
      }
      initialized.value = true;
    }

    watch(
      cart,
      (val) => {
        try {
          localStorage.setItem("cart", JSON.stringify(val));
        } catch {
          // ignore
        }
      },
      { deep: true },
    );
  }

  function add(product: any) {
    if (!product || !product.id) return;
    const existing = cart.value.find((p) => p.id === product.id);
    if (existing) return;
    cart.value.push({
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      thumbnail_url: product.thumbnail_url || null,
      type: product.type || null,
      qty: 1,
    });
  }

  function remove(id: number) {
    cart.value = cart.value.filter((p) => p.id !== id);
  }

  function clear() {
    cart.value = [];
  }

  const count = computed(() => cart.value.length);
  const total = computed(() =>
    cart.value.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0),
  );

  return {
    cart,
    add,
    remove,
    clear,
    count,
    total,
  };
}

