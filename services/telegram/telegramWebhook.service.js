import axios from "axios";
import FormData from "form-data";
import { env } from "../../config/env.js"; // or wherever you keep env







export async function sendErrorToTelegram(messageText) {
  const message = `🚨 *Alert!* 🚨\n\n${escapeMarkdown(messageText)}`;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const params = {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: "Markdown"
  };

  try {
    const telegramRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });

    if (!telegramRes.ok) {
      const errorText = await telegramRes.text();
      throw new Error(`Telegram API error: ${errorText}`);
    }

    console.log("✅ Telegram alert sent");
  } catch (err) {
    console.error("❌ Failed to send Telegram message:", err);
  }
}






async function getVideoBuffer(url) {

  if (!url) throw new Error("Video URL is missing/undefined");

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to fetch video. status=${response.status} statusText=${response.statusText} body=${body.slice(0, 300)}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer); // Convert arrayBuffer to Node.js Buffer
  return buffer;
}


export async function sendVideosAsMediaGroup( 
  eventId,
  startTime,
  forwardUrl, 
  inwardUrl, 
  alertType, 
  driver,
  formattedLocation, 
  vehicle, 
  time , 
  severity , 
  speedRange,
  summaryMessage  ) {
  

    const motiveLink = `https://app.gomotive.com/en-US/#/safety/events/${eventId};start_time=${startTime}`;  // link for motive
  try {

    
    const forwardBuffer = await getVideoBuffer(forwardUrl);
    const inwardBuffer = await getVideoBuffer(inwardUrl);

   

    const form = new FormData();

    form.append('chat_id', env.TELEGRAM_CHAT_ID);

    const media = [
      {
        type: 'video',
        media: 'attach://forward',               
        caption:
          `🌐 *Motive*\n` +
          `🚨 *${escapeMarkdownV2(alertType)}*\n` +
          `👨‍✈️ Driver: *${escapeMarkdownV2(driver)}*\n` +
          `📍 Location: *${escapeMarkdownV2(formattedLocation)}*\n` +
          `🚚 Vehicle: *${escapeMarkdownV2(vehicle)}*\n` +
          `🕒 Time: ${escapeMarkdownV2(time)}\n` +
          `🛑 Severity: *${escapeMarkdownV2(severity)}*\n` +
          `🧭 Speed range: *${escapeMarkdownV2(speedRange)}*\n` +
          `🔗 [Open in Motive](${escapeMarkdownV2(motiveLink)})\n` +
          `${escapeMarkdownV2(summaryMessage)}`,
        parse_mode: 'MarkdownV2'                         // markdown 
      },
      { 
        type: 'video',        
        media: 'attach://inward' 
      }
    ];

    form.append('forward', forwardBuffer, {
      filename: 'forward.mp4',
      contentType: 'video/mp4'
    });

    form.append('inward', inwardBuffer, {
      filename: 'inward.mp4',
      contentType: 'video/mp4'
    });

   
      


    form.append('media', JSON.stringify(media));

    const response = await axios.post(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMediaGroup`,
      form,
      { headers: form.getHeaders() }
    );
    
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;  
    const desc = data?.description;    
    const code = data?.error_code;

  console.error("❌ Failed to send video group", {
    axiosMessage: err?.message,
    status,
    error_code : code,
    description: desc,
    telegram: data,    
    retry_after: data?.parameters?.retry_after,
  });
    
  }

}



export async function sendImagesToGroup(
  eventId,
  startTime,
  forwardUrl,         // image URL (optional)
  inwardUrl,          // image URL (optional)
  alertType = '',
  driver = '',
  formattedLocation,
  vehicle = '',
  time = '',
  severity = '',
  speedRange = '',
  summaryMessage = ''
) {
  const motiveLink = `https://app.gomotive.com/en-US/#/safety/events/${eventId};start_time=${startTime}`;
  const caption =
    `❌ Missing videos in the safety event\n`+
    `🌐 *Motive*\n` +
    `🚨 *${escapeMarkdownV2(alertType)}*\n` +
    `👨‍✈️ Driver: *${escapeMarkdownV2(driver)}*\n` +
    `📍 Location: *${escapeMarkdownV2(formattedLocation)}*\n` +
    `🚚 Vehicle: *${escapeMarkdownV2(vehicle)}*\n` +
    `🕒 Time: ${escapeMarkdownV2(time)}\n` +
    `🛑 Severity: *${escapeMarkdownV2(severity)}*\n` +
    `🧭 Speed range: *${escapeMarkdownV2(speedRange)}*\n` +
    `🔗 [Open in Motive](${escapeMarkdownV2(motiveLink)})\n`
    `${summaryMessage}`;

  const photos = [forwardUrl, inwardUrl].filter(Boolean);

  if (photos.length <= 1) {
    // ---- single image -> sendPhoto ----------------------------------------
    const form = new FormData();
    form.append('chat_id', env.TELEGRAM_CHAT_ID);
    form.append('photo', photos[0]);            // just pass the URL
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');

    await axios.post(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
      form,
      { headers: form.getHeaders() }
    );
  } else {
    // ---- two images -> sendMediaGroup (album) ------------------------------
    const form = new FormData();
    form.append('chat_id', env.TELEGRAM_CHAT_ID);
    const media = [
      { type: 'photo', media: photos[0], caption, parse_mode: 'Markdown' },
      { type: 'photo', media: photos[1] }
    ];
    form.append('media', JSON.stringify(media));

    await axios.post(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMediaGroup`,
      form,
      { headers: form.getHeaders() }
    );
  }
}


function escapeMarkdown(t) {
  return String(t).replace(/([_*[\]()`])/g, '\\$1');  // legacy Markdown
}


function escapeMarkdownV2(text = "") {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}