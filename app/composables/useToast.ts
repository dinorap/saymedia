type ToastType = "success" | "error" | "info";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

let hideTimeout: ReturnType<typeof setTimeout> | null = null;

export const useToast = () => {
  const toast = useState<ToastState>("app-toast", () => ({
    visible: false,
    message: "",
    type: "info",
  }));

  function show(message: string, type: ToastType = "info", duration = 3000) {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    toast.value = {
      visible: true,
      message: String(message || ""),
      type,
    };

    if (import.meta.client && duration > 0) {
      hideTimeout = setTimeout(() => {
        toast.value.visible = false;
      }, duration);
    }
  }

  function hide() {
    toast.value.visible = false;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  return { toast, show, hide };
}

