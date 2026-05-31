import { mapMotiveWebhook } from "../../mappers/motiveWebhookMapper.js";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { AppError } from "../../utils/AppError.js";



export async function processTelegramMessageWebhook(payload) {
  if (!payload || typeof payload !== "object") {
    throw new AppError("Invalid webhook payload", 400, "INVALID_PAYLOAD");
  }

  




  const message = payload?.message || payload?.edited_message;
  if (!message) {
    logger.error("Telegram error: Request doesn't contain Message BODY");
    return null;
  };

  const repliedMessageCaption = message?.reply_to_message?.caption ?? null;

  if (!repliedMessageCaption) {
    logger.warn("Telegram error: it's NOT a reply to a caption message");
    return null;
  }
  
  const messageText = message.text || message.caption || null;

  if(!messageText){
    logger.warn("Telegram error: Message is empty , No Caption or Text");
    return null;
  }
  
  
  


  const parsedFilteredUserMessage = parseMessage(messageText,repliedMessageCaption);  

  


  return parsedFilteredUserMessage;
}



function parseMessage(userMessage,repliedMessageCaption) {
  const result = {    
    motiveId: null,
    type:     null,
    severity: null,
    note:     null
  };

  

  // Extract type — first word after the leading emoji
  const typeMatch = userMessage.match(/\p{Emoji}[\uFE0F]?\s*(\w+)/u);
  if (typeMatch) result.type = typeMatch[1];

  // Extract severity — only exists if ⭕️ is present
  const severityMatch = userMessage.match(/⭕️\s*(\w+)/);
  if (severityMatch) result.severity = severityMatch[1];

  // Extract note/reason — everything after "Note :" or "Reason :"
  const noteMatch = userMessage.match(/(?:Note|Reason)\s*:\s*(.+)/s);
  if (noteMatch) {
    result.note = noteMatch[1]
      .trim()
      .replace(/@\S+/g, '')  // remove @something words
      .trim();                // trim again in case it was at the end
  }


  
  if (repliedMessageCaption) {
    const idCaption = repliedMessageCaption.match(/Motive ID\s*:\s*(\d+)/);
    if (idCaption) result.motiveId = idCaption[1];
  }


  return result;
}

