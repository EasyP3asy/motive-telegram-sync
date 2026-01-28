
import { logger } from "../utils/logger.js";
import { processMotiveWebhook } from "../services/motive/motiveWebhookParser.service.js";
import { requestVideo , getVideoMetaData , waitForVideoReady } from  "../services/motive/motiveVideoRequestService.js";
import { sendVideosAsMediaGroup , sendImagesToGroup } from "../services/telegram/telegramMessageSender.service.js"

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
      let videoRequestResponseCode = null;      
      let isVideoReady = false;
      let videoMetaData = null;
      
      

      if (!hasVideo) {
        videoRequestResponseCode = await requestVideo(normalizedWebhook,null,'POST');
        videoMetaData = await getVideoMetaData(normalizedWebhook);

        normalizedWebhook.media.forwardVideoUrl = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos?.front_facing_plain_url; 

        normalizedWebhook.media.inwardVideoUrl = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos?.driver_facing_plain_url;


        if(videoRequestResponseCode === 201 ){         
          isVideoReady = await waitForVideoReady(normalizedWebhook);          
        }
       

      }

      videoMetaData = await getVideoMetaData(normalizedWebhook);
      normalizedWebhook.media.forwardVideoUrl = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos?.front_facing_plain_url; 

      normalizedWebhook.media.inwardVideoUrl = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos?.driver_facing_plain_url;

      normalizedWebhook.location = videoMetaData ?  videoMetaData?.driver_performance_event?.address : normalizedWebhook.location;     

      




      if(requestBody?.sub_events && requestBody?.sub_events?.length>0){
        let subEvents = requestBody.sub_events;

        for(let subEvent of subEvents){
            const subEventForwardVideoUrl = subEvent?.camera_media?.downloadable_videos?.front_facing_plain_url;
            const subEvenInwardVideoUrl = subEvent?.camera_media?.downloadable_videos?.driver_facing_plain_url;

            if(subEventForwardVideoUrl && subEvenInwardVideoUrl){
              await sendVideosAsMediaGroup(
                normalizedWebhook.eventId, 
                normalizedWebhook.startTime,
                subEventForwardVideoUrl,
                subEvenInwardVideoUrl,
                normalizedWebhook.parsedAlertType,
                normalizedWebhook.driverFullName,
                normalizedWebhook.location,   
                normalizedWebhook.vehicleNumber,
                normalizedWebhook.formattedTimestamp,
                normalizedWebhook.severity,
                normalizedWebhook.speedRange                   
              );
            }
        }
        return ;

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
          normalizedWebhook.speedRange          
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
          normalizedWebhook.speedRange        
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
