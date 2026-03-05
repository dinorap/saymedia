interface ConfirmState {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

let resolver: ((value: boolean) => void) | null = null;

export const useConfirm = () => {
  const state = useState<ConfirmState>("app-confirm", () => ({
    visible: false,
    title: "Xác nhận",
    message: "",
    confirmText: "Đồng ý",
    cancelText: "Hủy",
  }));

  function confirm(options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  }) {
    state.value.visible = true;
    state.value.title = options.title || "Xác nhận";
    state.value.message = options.message;
    state.value.confirmText = options.confirmText || "Đồng ý";
    state.value.cancelText = options.cancelText || "Hủy";

    return new Promise<boolean>((resolve) => {
      resolver = resolve;
    });
  }

  function resolveConfirm(value: boolean) {
    state.value.visible = false;
    if (resolver) {
      resolver(value);
      resolver = null;
    }
  }

  return { state, confirm, resolveConfirm };
};
