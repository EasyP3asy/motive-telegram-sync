import axios from "axios";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

export async function onTelegramUpdate(update) {
  // Common update shapes:
  const message = update?.message || update?.edited_message;
  if (!message) return;

  const chatId = 5192782905;
  const text = message.text || "";

  logger.info("Telegram message received", {
    chatId,
    from: message.from?.username,
    text,
  });

  // Example: react to a command
  if (text.startsWith("/status")) {
    await sendMessage(chatId, "✅ Server is up");
    return;
  }

  // Example: keyword reaction
  if (text.toLowerCase().includes("video")) {
    await sendMessage(chatId, "📹 Got it — checking video links…");
  }
}

async function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, { chat_id: chatId, text });
}
