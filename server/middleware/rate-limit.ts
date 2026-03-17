import { getRequestIpKey } from "../utils/authHelpers";
import { checkRateLimit, rateLimitKey } from "../utils/rateLimit";

function isBypassedPath(pathname: string) {
  // Don't rate-limit assets or websocket upgrade endpoints here.
  return (
    pathname.startsWith("/_nuxt") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/ws/")
  );
}

export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const pathname = url.pathname || "/";

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) return;
  if (isBypassedPath(pathname)) return;

  // Allow webhook bursts (provider retries) but still keep a ceiling
  const isWebhook = pathname === "/api/payment/webhook";

  const ip = getRequestIpKey(event);
  const key = rateLimitKey(["global", ip, isWebhook ? "webhook" : "api"]);

  const max = Number(
    isWebhook
      ? process.env.RATE_LIMIT_WEBHOOK_PER_MINUTE || 600
      : process.env.RATE_LIMIT_GLOBAL_PER_MINUTE || 240,
  );
  const safeMax = Number.isFinite(max) && max > 0 ? Math.round(max) : isWebhook ? 600 : 240;

  checkRateLimit({
    key,
    max: safeMax,
    windowMs: 60_000,
    statusMessage: "Quá nhiều request. Vui lòng thử lại sau.",
  });
});

