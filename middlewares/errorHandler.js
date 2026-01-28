// middlewares/errorHandler.js
import { AppError } from "../utils/AppError.js";

export function errorHandler(err, req, res, next) {
  // 1) Invalid JSON body (express.json)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  // If we already sent a response, just delegate + log
  if (res.headersSent) {
    console.error("Error after headers sent:", err);
    return next(err);
  }

  // 2) If you used AppError yourself
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // 3) Axios-style upstream error mapping
  // axios errors often have err.response.status + err.response.data
  const upstreamStatus = err.response?.status;
  const upstreamData = err.response?.data;

  if (upstreamStatus) {
    // Telegram rate limit (429) often contains retry_after
    if (upstreamStatus === 429) {
      const retryAfter =
        upstreamData?.parameters?.retry_after ??
        upstreamData?.retry_after ??
        err.retry_after;

      return res.status(429).json({
        error: "Rate limited",
        ...(retryAfter != null ? { retry_after: retryAfter } : {}),
      });
    }

    // Other upstream problems (telegram/motive/etc) — don’t leak internals by default
    return res.status(502).json({
      error: "Upstream service error",
      ...(process.env.NODE_ENV !== "production"
        ? { upstream_status: upstreamStatus, upstream_data: upstreamData }
        : {}),
    });
  }

  // 4) Generic fallback
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
