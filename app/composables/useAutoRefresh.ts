import { onBeforeUnmount, onMounted, ref } from "vue";

type AutoRefreshOpts = {
  intervalMs?: number;
  /**
   * When true, pause timer when tab is hidden (saves DB/API load).
   * Default: true.
   */
  pauseWhenHidden?: boolean;
};

export function useAutoRefresh(
  fn: () => void | Promise<void>,
  opts: AutoRefreshOpts = {},
) {
  const intervalMs = Math.max(1000, Number(opts.intervalMs || 15000));
  const pauseWhenHidden = opts.pauseWhenHidden !== false;
  const timer = ref<any>(null);

  const isVisible = () =>
    typeof document === "undefined" ? true : document.visibilityState === "visible";

  const tick = async () => {
    if (pauseWhenHidden && !isVisible()) return;
    try {
      await fn();
    } catch {
      // keep silent; callers should handle in fn if needed
    }
  };

  const start = () => {
    if (timer.value) return;
    timer.value = setInterval(() => {
      tick();
    }, intervalMs);
  };

  const stop = () => {
    if (!timer.value) return;
    clearInterval(timer.value);
    timer.value = null;
  };

  const onVis = () => {
    if (!pauseWhenHidden) return;
    // Run one refresh when user comes back
    if (isVisible()) tick();
  };

  onMounted(() => {
    start();
    if (pauseWhenHidden && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }
  });

  onBeforeUnmount(() => {
    stop();
    if (pauseWhenHidden && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVis);
    }
  });

  return { start, stop, tick };
}

