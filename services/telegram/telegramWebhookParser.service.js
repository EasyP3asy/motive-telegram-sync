import { mapMotiveWebhook } from "../../mappers/motiveWebhookMapper.js";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { AppError } from "../../utils/AppError.js";

export async function processTelegramMessageWebhook(payload) {
  if (!payload || typeof payload !== "object") {
    throw new AppError("Invalid webhook payload", 400, "INVALID_PAYLOAD");
  }

  const normalized = mapMotiveWebhook(payload);

  // A couple of "must-haves" (tweak as you like)
  // if (!normalized.eventId) {
  //   throw new AppError(
  //     "Webhook payload missing required fields",
  //     400,
  //     "MISSING_REQUIRED_FIELDS",
  //     { eventId: normalized.eventId }
  //   );
  // }


  const message = payload?.message || payload?.edited_message;
  if (!message) return;

  const chatId = 5192782905;
  const text = message.text || "";


  

  



  return normalized;
}
