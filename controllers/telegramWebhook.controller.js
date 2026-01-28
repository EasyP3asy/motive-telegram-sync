import { logger } from "../utils/logger.js";
import { processTelegramMessageWebhook } from "../services/telegram/telegramWebhookParser.service.js";

export async function handleTelegramUpdate(req, res) {
  // Telegram requires a fast 200 OK
  res.json({ ok: true });

  const requestBody = req.body;

   void (async () => {
      try {
        const normalizedWebhook = await processTelegramMessageWebhook(requestBody);


        } catch (err) {
      logger.error("Failed to process Motive webhook", err);
      logger.debug("Payload", requestBody);
    }
  })();


 

}


