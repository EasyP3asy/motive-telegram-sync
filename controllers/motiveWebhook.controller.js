
import { logger } from "../utils/logger.js";
import { processMotiveWebhook } from "../services/motive/motiveWebhook.service.js";
import { requestVideo , getVideoMetaData , waitForVideoReady } from  "../services/motive/motiveVideoRequestService.js";
import { sendVideosAsMediaGroup , sendImagesToGroup } from "../services/telegram/telegramWebhook.service.js"

export async function handleMotiveWebhook(req, res) {
  const requestBody = req.body;

  // Log the webhook (keep it light)
  logger.info("Motive webhook received");

  
   void (async () => {
    try {
      const normalizedWebhook = await processMotiveWebhook(requestBody);

      const hasVideo =
        normalizedWebhook?.media?.forwardVideoUrl ||
        normalizedWebhook?.media?.inwardVideoUrl;
      let videoRequestResponse = null;
      let videoMetaData = await getVideoMetaData(normalizedWebhook);
      let isVideoReady = false;
    
      
      normalizedWebhook.location = videoMetaData ?  videoMetaData?.driver_performance_event?.address : normalizedWebhook.location;




      if (!hasVideo) {
        videoRequestResponse = await requestVideo(normalizedWebhook,null,'POST');
        

        

        if(videoRequestResponse === 201 && videoMetaData ){
          
          normalizedWebhook.media.forwardVideoUrl = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos?.front_facing_plain_url; 
          normalizedWebhook.media.inwardVideoUrl = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos?.driver_facing_plain_url;
          
          isVideoReady = await waitForVideoReady(normalizedWebhook);          
        }
      }

      




      if(isVideoReady || hasVideo){

        await sendVideosAsMediaGroup(
          normalizedWebhook.eventId,
          normalizedWebhook.startTime,
          normalizedWebhook.media.forwardVideoUrl,
          normalizedWebhook.media.inwardVideoUrl,
          normalizedWebhook.parsedAlertType,
          normalizedWebhook.driverFullName,
          normalizedWebhook.location,
          normalizedWebhook.vehicleNumber,
          normalizedWebhook.formattedTimestamp,
          normalizedWebhook.severity,
          normalizedWebhook.speedRange,
          ''
        );

      
      }else{

        await sendImagesToGroup(
          normalizedWebhook.eventId,
          normalizedWebhook.startTime,
          normalizedWebhook.media.forwardJPGUrl,
          normalizedWebhook.media.inwardJPGUrl,
          normalizedWebhook.parsedAlertType,
          normalizedWebhook.driverFullName,
          normalizedWebhook.location,
          normalizedWebhook.vehicleNumber,
          normalizedWebhook.formattedTimestamp,
          normalizedWebhook.severity,
          normalizedWebhook.speedRange,
          ''
        );
        
      }
      

      


      
      



      //logger.debug("Video request response", JSON.stringify(normalizedWebhook));




    } catch (err) {
      logger.error("Failed to process Motive webhook", err);
      logger.debug("Payload", requestBody);
    }
  })();
  
  

  // Always respond quickly to webhooks
  return res.json({ ok: true });
}
