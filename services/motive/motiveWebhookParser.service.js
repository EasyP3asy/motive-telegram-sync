import { mapMotiveWebhook } from "../../mappers/motiveWebhookMapper.js";
import { logger } from "../../utils/logger.js";
import { AppError } from "../../utils/AppError.js";

export async function processMotiveWebhook(payload) {
  if (!payload || typeof payload !== "object") {
    throw new AppError("Invalid webhook payload", 400, "INVALID_PAYLOAD");
  }

  

  const normalized = mapMotiveWebhook(payload);

  

  // A couple of "must-haves" (tweak as you like)
  if (!normalized.eventId) {
    throw new AppError(
      "Webhook payload missing required fields",
      400,
      "MISSING_REQUIRED_FIELDS",
      { eventId: normalized.eventId }
    );
  }


  return normalized;
}
