import axios from "axios";
import FormData from "form-data";
import { env } from "../../config/env.js"; // or wherever you keep env
import https from "https";
import { logger } from "../../utils/logger.js";

const telegramAgent = new https.Agent({
  keepAlive: true,
  timeout: 600_000, // 10 min socket-level timeout
});



// ─── helpers ──────────────────────────────────────────────────────────────── 

function escapeMarkdown(t) {
  return String(t).replace(/([_*[\]()`])/g, '\\$1');  // legacy Markdown
}


function escapeMarkdownV2(text = "") {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}


/**
 * Returns a Node.js Readable stream for the given URL.
 * Much more memory-efficient than buffering the whole file.
 */



async function getVideoStream(url) {
  if (!url) throw new Error("Video URL is missing/undefined");
 
  let response;
  try {
    response = await axios.get(url, {
      responseType: "stream",
      timeout: 0,
    });
  } catch (err) {
    const status = err?.response?.status;
    if (status === 403) {
      throw new Error(`Video URL is expired (HTTP 403). URL: ${url.substring(0, 100)}...`);
    }
    if (status === 404) {
      throw new Error(`Video URL not found (HTTP 404). URL: ${url.substring(0, 100)}...`);
    }
    throw err;
  }
 
  return response.data;
}

 






// ─── sendErrorToTelegram ────────────────────────────────────────────────────

export async function sendMessageToTelegram(messageText) {
  const message = `🚨 *Alert!* 🚨\n\n${escapeMarkdown(messageText)}`;
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  const params = {
    chat_id: env.TELEGRAM_USER_ID,
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
  dualEnhancedVideoUrl,
  alertType, 
  driver,
  formattedLocation, 
  vehicle, 
  time , 
  severity , 
  speedRange
  ) {
  

    const motiveLink = `https://app.gomotive.com/en-US/#/safety/events/${eventId};start_time=${startTime}`;  // link for motive
  try {

    let forwardBuffer = null;
    let inwardBuffer = null ;
    let dualVideoBuffer = null;

    if(dualEnhancedVideoUrl){
      dualVideoBuffer = await getVideoBuffer(dualEnhancedVideoUrl);
    }
    else if (forwardUrl && inwardUrl){
      forwardBuffer = await getVideoBuffer(forwardUrl);
      inwardBuffer = await getVideoBuffer(inwardUrl);
    }
 
     
    const caption =  
          `🌐 *Motive ID : ${eventId}*\n` +
          `${escapeMarkdownV2("============================")}\n` +
          `🚨 *${escapeMarkdownV2(alertType)}*\n` +
          `👨‍✈️ Driver: *${escapeMarkdownV2(driver)}*\n` +
          `📍 Location: *${escapeMarkdownV2(formattedLocation)}*\n` +
          `🚚 Vehicle: *${escapeMarkdownV2(vehicle)}*\n` +
          `🕒 Time: ${escapeMarkdownV2(time)}\n` +
          `🛑 Severity: *${escapeMarkdownV2(severity)}*\n` +
          `🧭 Speed range: *${escapeMarkdownV2(speedRange)}*\n` +
          `🔗 [Open in Motive](${escapeMarkdownV2(motiveLink)})\n`;
    
    let media =[];
    const form = new FormData();

    form.append('chat_id', env.TELEGRAM_CHAT_ID);

    if(dualEnhancedVideoUrl){
        media =  [
          {
            type: 'video',
            media: 'attach://dualEnhancedVideo',               
            caption,         
            parse_mode: 'MarkdownV2'                         // markdown 
          },     
        ];

        form.append('dualEnhancedVideo', dualVideoBuffer, {
          filename: 'dualEnhancedVideo.mp4',
          contentType: 'video/mp4'
        });
    }else if(forwardBuffer && inwardBuffer){

       media = [
        {
          type: 'video',
          media: 'attach://forwardUrl',               
          caption,         
          parse_mode: 'MarkdownV2'                         // markdown 
        },
        {
          type : 'video',
          media: 'attach://inwardUrl'
        } 
      ];

      form.append('forwardUrl', forwardBuffer, {
        filename: 'forwardUrl.mp4',
        contentType: 'video/mp4'
      });

      form.append('inwardUrl', inwardBuffer, {
        filename: 'inwardUrl.mp4',
        contentType: 'video/mp4'
      });

    }

   

   

   
      


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
    forwardUrl,
    inwardUrl,                 
    cause: err?.cause?.message,
    stack: err?.stack,    
    url: err?.config?.url,
    timeout: err?.config?.timeout,
    eventId,
  });
    
  }

}



export async function sendImagesToGroup(
  eventId,
  startTime,
  forwardUrl,
  inwardUrl,
  alertType = '',
  driver = '',
  formattedLocation,
  vehicle = '',
  time = '',
  severity = '',
  speedRange = ''
) {
  const form = new FormData();
  form.append('chat_id', env.TELEGRAM_CHAT_ID);
 
  const motiveLink = `https://app.gomotive.com/en-US/#/safety/events/${eventId};start_time=${startTime}`;
  const caption =
    `❌ Missing videos in the safety event\n` +
    `🌐 *Motive ID : ${escapeMarkdownV2(eventId)}*\n` +
    `${escapeMarkdownV2("============================")}\n` +
    `🚨 *${escapeMarkdownV2(alertType)}*\n` +
    `👨‍✈️ Driver: *${escapeMarkdownV2(driver)}*\n` +
    `📍 Location: *${escapeMarkdownV2(formattedLocation)}*\n` +
    `🚚 Vehicle: *${escapeMarkdownV2(vehicle)}*\n` +
    `🕒 Time: ${escapeMarkdownV2(time)}\n` +
    `🛑 Severity: *${escapeMarkdownV2(severity)}*\n` +
    `🧭 Speed range: *${escapeMarkdownV2(speedRange)}*\n` +
    `🔗 [Open in Motive](${escapeMarkdownV2(motiveLink)})\n`;
 
  // filter(Boolean) catches null/undefined but NOT the string "null" or whitespace
  const isValidUrl = (u) => typeof u === 'string' && u.startsWith('http');
  const photos = [forwardUrl, inwardUrl].filter(isValidUrl);

  if (photos.length === 0) {
      logger.warn("sendImagesToGroup: no valid image URLs provided, skipping", {
        eventId,
        forwardUrl,
        inwardUrl,
      });
      return;
    }

 
  try {    

    const buffers = await Promise.all(
      photos.map(url => getVideoBuffer(url))
    );


 
    if (buffers.length === 1) {
      form.append('photo', buffers[0], { filename: 'photo.jpg', contentType: 'image/jpeg' });
      form.append('caption', caption);
      form.append('parse_mode', 'MarkdownV2');
 
      await axios.post(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
        form,
        { headers: form.getHeaders(), timeout: 60_000 }
      );
    } else {
      form.append('photo1', buffers[0], { filename: 'forward.jpg', contentType: 'image/jpeg' });
      form.append('photo2', buffers[1], { filename: 'inward.jpg',  contentType: 'image/jpeg' });

      const media = [
        { type: 'photo', media: 'attach://photo1', caption, parse_mode: "MarkdownV2" },
        { type: 'photo', media: 'attach://photo2' },
      ];
      form.append('media', JSON.stringify(media));
 
      await axios.post(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMediaGroup`,
        form,
        { headers: form.getHeaders(), timeout: 60_000 }
      );
    }
 
    console.log("✅ Images sent for event", eventId);
  } catch (err) {
    console.error("❌ Failed to send images", {
      message:     err?.message,
      status:      err?.response?.status,
      description: err?.response?.data?.description,
      // Show actual values sent so we can see exactly what Telegram rejected
      photosSent:  photos,
      eventId,
    });
  }
}



// ─── sendVideosAsMediaGroup => Streaming ─────────────────────────────────────────────────



 
export async function sendVideosAsMediaGroupStream(
  eventId,
  startTime,
  forwardUrl,
  inwardUrl,
  dualEnhancedVideoUrl,
  alertType,
  driver,
  formattedLocation,
  vehicle,
  time,
  severity,
  speedRange,
  retryCount = 0
) {
  const MAX_RETRIES = 2;
  const motiveLink = `https://app.gomotive.com/en-US/#/safety/events/${eventId};start_time=${startTime}`;
 
  const caption =
    `🌐 *Motive ID : ${eventId}*\n` +
    `${escapeMarkdownV2("============================")}\n` +
    `🚨 *${escapeMarkdownV2(alertType)}*\n` +
    `👨‍✈️ Driver: *${escapeMarkdownV2(driver)}*\n` +
    `📍 Location: *${escapeMarkdownV2(formattedLocation)}*\n` +
    `🚚 Vehicle: *${escapeMarkdownV2(vehicle)}*\n` +
    `🕒 Time: ${escapeMarkdownV2(time)}\n` +
    `🛑 Severity: *${escapeMarkdownV2(severity)}*\n` +
    `🧭 Speed range: *${escapeMarkdownV2(speedRange)}*\n` +
    `🔗 [Open in Motive](${escapeMarkdownV2(motiveLink)})\n`;
 
  try {    
 
    const form = new FormData();
    form.append("chat_id", env.TELEGRAM_CHAT_ID);
 
    let media = [];
 
    if (dualEnhancedVideoUrl) {
      const stream = await getVideoStream(dualEnhancedVideoUrl);
      form.append("dualEnhancedVideo", stream, {
        filename: "dualEnhancedVideo.mp4",
        contentType: "video/mp4",
      });
 
      media = [
        {
          type: "video",
          media: "attach://dualEnhancedVideo",
          caption,
          parse_mode: "MarkdownV2",
        },
      ];
    } else if (forwardUrl && inwardUrl) {
      const [forwardStream, inwardStream] = await Promise.all([
        getVideoStream(forwardUrl),
        getVideoStream(inwardUrl),
      ]);
 
      form.append("forwardUrl", forwardStream, {
        filename: "forward.mp4",
        contentType: "video/mp4",
      });
      form.append("inwardUrl", inwardStream, {
        filename: "inward.mp4",
        contentType: "video/mp4",
      });
 
      media = [
        {
          type: "video",
          media: "attach://forwardUrl",
          caption,
          parse_mode: "MarkdownV2",
        },
        {
          type: "video",
          media: "attach://inwardUrl",
        },
      ];
    } else {
      console.warn("sendVideosAsMediaGroupStream: no video URLs provided, skipping");
      return;
    }
 
    form.append("media", JSON.stringify(media));
 
    const response = await axios.post(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMediaGroup`,
      form,
      {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 0, 
        httpsAgent: telegramAgent,
      }
    );
 
    console.log("✅ Video group sent, message_id:", response.data?.result?.[0]?.message_id);
 
  } catch (err) {
    const status      = err?.response?.status;
    const data        = err?.response?.data;
    const retryAfter  = data?.parameters?.retry_after;
 
    // ── Diagnose the error type ────────────────────────────────────────────
    const isNetworkError = !status && (
      err?.code === 'ECONNRESET' ||
      err?.code === 'ECONNREFUSED' ||
      err?.code === 'ENOTFOUND' ||
      err?.code === 'ETIMEDOUT' ||
      err instanceof AggregateError ||
      err?.constructor?.name === 'AggregateError'
    );
 
    const isTelegramRateLimit = status === 429;
    const isExpiredUrl = err?.message?.includes('expired') || err?.message?.includes('inaccessible');
 
    console.error("❌ Failed to send video group", {
      errorType: isNetworkError
        ? "NETWORK_ERROR — server cannot reach Telegram API (check firewall/proxy)"
        : isTelegramRateLimit
          ? "TELEGRAM_RATE_LIMIT"
          : isExpiredUrl
            ? "EXPIRED_URL"
            : "UNKNOWN",
      axiosMessage: err?.message,
      axiosCode: err?.code,
      status,
      error_code: data?.error_code,
      description: data?.description,
      retry_after: retryAfter,
      forwardUrl: forwardUrl?.substring(0, 80) + "...",
      inwardUrl: inwardUrl?.substring(0, 80) + "...",
      eventId,
    });
 
    // ── Retry logic ────────────────────────────────────────────────────────
 
    // Rate limited: wait and retry
    if (isTelegramRateLimit && retryAfter && retryCount < MAX_RETRIES) {
      const waitMs = (retryAfter + 2) * 1000;
      console.warn(`⏳ Rate limited. Retrying after ${retryAfter}s... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(r => setTimeout(r, waitMs));
      return sendVideosAsMediaGroupStream(
        eventId, startTime, forwardUrl, inwardUrl, dualEnhancedVideoUrl,
        alertType, driver, formattedLocation, vehicle, time, severity, speedRange,
        retryCount + 1
      );
    }
 
    // Network error: wait 10s and retry once
    if (isNetworkError && retryCount < MAX_RETRIES) {
      console.warn(`🔄 Network error. Retrying in 10s... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(r => setTimeout(r, 10_000));
      return sendVideosAsMediaGroupStream(
        eventId, startTime, forwardUrl, inwardUrl, dualEnhancedVideoUrl,
        alertType, driver, formattedLocation, vehicle, time, severity, speedRange,
        retryCount + 1
      );
    }
 
    if (isNetworkError) {
      console.error(
        "🚫 Network error persists after retries. " +
        "Check that your server can reach api.telegram.org on port 443. " +
        "If behind a firewall, you may need to whitelist Telegram IP ranges " +
        "or configure an HTTPS proxy."
      );
    }
  }
}



