
import { logger } from "../utils/logger.js";
import { processMotiveWebhook } from "../services/motive/motiveWebhook.service.js";

export async function handleMotiveWebhook(req, res) {
  const requestBody = req.body;

  // Log the webhook (keep it light)
  logger.info("Motive webhook received");

  
  processMotiveWebhook(requestBody);
  

  

  // Always respond quickly to webhooks
  return res.json({ ok: true });
}
