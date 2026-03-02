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
    toast.value.visible = true;
    toast.value.message = message;
    toast.value.type = type;

    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    if (process.client && duration > 0) {
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

