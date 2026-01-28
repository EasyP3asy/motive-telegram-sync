import { logger } from "../utils/logger.js";
import { onTelegramUpdate } from "../services/telegram/telegramUpdate.service.js";

export async function handleTelegramUpdate(req, res) {
  // Telegram requires a fast 200 OK
  res.json({ ok: true });

  // Process in background
  void onTelegramUpdate(req.body).catch((err) => {
    logger.error("Failed to process Telegram update", err);
  });
}
