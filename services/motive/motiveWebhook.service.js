import { mapMotiveWebhook } from "../../mappers/motiveWebhookMapper.js";
// import { sendImagesToGroup, sendVideosAsMediaGroup } from "../integrations/telegram/telegramService.js"; 


export async function processMotiveWebhook(payload) {

  const normalizedPayload = mapMotiveWebhook(payload);

  console.log(normalizedPayload);
  /*
  const eventType = normalizedPayload.eventType;
  const alertType = normalizedPayload.parsedAlertType ?? normalizedPayload.raw?.type ?? null;

  const driverName = normalizedPayload.driverFullName ?? "Unknown";
  const vehicleNumber = normalizedPayload.vehicleNumber ?? "Unknown";

  // These names from your snippet:
  const formattedLocation = normalizedPayload.location ?? "Unknown location";
  const formattedDate = normalizedPayload.formattedTimestamp ?? "Unknown time";
  const severity = normalizedPayload.severity;
  const speedRange = normalizedPayload.speedRange;

  const summaryMessage = buildSummaryMessage({ normalizedPayload }); // optional helper

  const forwardJPGUrl = normalizedPayload.media?.forwardJPGUrl ?? null;
  const inwardJPGUrl = normalizedPayload.media?.inwardJPGUrl ?? null;

  // main event media
  const mainForwardVideoUrl = normalizedPayload.media?.forwardVideoUrl ?? null;
  const mainInwardVideoUrl = normalizedPayload.media?.inwardVideoUrl ?? null;

  // 1) If videos missing but images exist, send images
  if (
    (!mainForwardVideoUrl || !mainInwardVideoUrl) &&
    eventType === "driver_performance_event_created" &&
    inwardJPGUrl &&
    forwardJPGUrl
  ) {
    await sendImagesToGroup({
      forwardUrl: forwardJPGUrl,
      inwardUrl: inwardJPGUrl,
      alertType,
      driver: driverName,
      formattedLocation,
      vehicle: vehicleNumber,
      time: formattedDate,
      severity,
      speedRange,
      summaryMessage,
    });
    return;
  }

  // 2) If there are sub events, iterate and send videos from each sub event
  if (Array.isArray(payload?.sub_events) && payload.sub_events.length > 0) {
    for (const subEvent of payload.sub_events) {
      const forwardVideoUrl =
        subEvent?.camera_media?.downloadable_videos?.front_facing_plain_url ?? null;
      const inwardVideoUrl =
        subEvent?.camera_media?.downloadable_videos?.driver_facing_plain_url ?? null;

      if (forwardVideoUrl && inwardVideoUrl) {
        await sendVideosAsMediaGroup({
          forwardUrl: forwardVideoUrl,
          inwardUrl: inwardVideoUrl,
          alertType,
          driver: driverName,
          formattedLocation,
          vehicle: vehicleNumber,
          time: formattedDate,
          severity,
          speedRange,
          summaryMessage,
        });
      }
    }
    return;
  }

  // 3) Otherwise send main event videos if present
  if (mainForwardVideoUrl && mainInwardVideoUrl) {
    await sendVideosAsMediaGroup({
      forwardUrl: mainForwardVideoUrl,
      inwardUrl: mainInwardVideoUrl,
      alertType,
      driver: driverName,
      formattedLocation,
      vehicle: vehicleNumber,
      time: formattedDate,
      severity,
      speedRange,
      summaryMessage,
    });
  }
}

function buildSummaryMessage({ normalizedPayload }) {
  // Keep it simple; customize later
  const parts = [
    normalizedPayload.parsedAlertType ? `Alert: ${normalizedPayload.parsedAlertType}` : null,
    normalizedPayload.severity ? `Severity: ${normalizedPayload.severity}` : null,
    normalizedPayload.speedRange ? `Speed: ${normalizedPayload.speedRange}` : null,
  ].filter(Boolean);
  return parts.join(" | ");

  */
}
