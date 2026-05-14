
import { logger } from "../utils/logger.js";
import { processMotiveWebhook } from "../services/motive/motiveWebhookParser.service.js";
import { 
   requestVideo ,
   getVideoMetaData ,
   waitForVideoReady ,
   requestEnhancedDualVideo ,
   waitForEnhancedVideoURLReady,  
} from  "../services/motive/motiveVideoRequestService.js";

import { 
  sendVideosAsMediaGroupStream , 
  sendImagesToGroup 
} from "../services/telegram/telegramMessageSender.service.js"


export async function handleMotiveWebhook(req, res) {
  const requestBody = req.body;

  
  logger.info("Motive webhook received");

  res.json({ ok: true });

   void (async () => {
    try {
      const normalizedWebhook = await processMotiveWebhook(requestBody);
      

      let isEnhancedVideoReadyAndAvailable = false;
      let isRawVideoReadyAndAvailable = false;      
      let enhancenVideoRequestResponse = null;        
      let videoMetaData = null;      

       // ── 1. Request raw video ──────────────────────────────────────────────
      const rawVideoRequestResponse = await requestVideo(normalizedWebhook,null,'POST');      

      if(!rawVideoRequestResponse){
        logger.error('Raw Video Request responded with code : ',rawVideoRequestResponse ) ;              
      }

      // ── 2. Fetch metadata ─────────────────────────────────────────────────
      videoMetaData = await getVideoMetaData(normalizedWebhook);

      if(videoMetaData){
        const videos = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos;
        normalizedWebhook.media.forwardVideoUrl = videos?.front_facing_plain_url ?? null;
        normalizedWebhook.media.inwardVideoUrl = videos?.driver_facing_plain_url ?? null;
      }else{
        logger.info('No Video Meta Data ' , videoMetaData) ;
      }
      

       // ── 3. Wait for raw video to be ready ─────────────────────────────────

      if(
        rawVideoRequestResponse &&
        normalizedWebhook.media.forwardVideoUrl &&
        !requestBody?.sub_events
      ){         
        isRawVideoReadyAndAvailable = await waitForVideoReady(
         normalizedWebhook.media.forwardVideoUrl,
         normalizedWebhook.media.inwardVideoUrl,
         15,
         normalizedWebhook
        );  

      }else{
        logger.info('Skipping raw video wait for event', normalizedWebhook.eventId);
      }

      
      // ── 4. Request enhanced dual video ────────────────────────────────────
      if(isRawVideoReadyAndAvailable){
        enhancenVideoRequestResponse = await requestEnhancedDualVideo(normalizedWebhook,null,'PUT');
      }

       // ── 5. Wait for enhanced video URL ────────────────────────────────────
      if(enhancenVideoRequestResponse?.result === true){
          videoMetaData = await waitForEnhancedVideoURLReady(normalizedWebhook);
          
          const dualUrl = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos?.dual_facing_enhanced_url;

          normalizedWebhook.media.dualEnhancedVideoUrl = dualUrl ?? null; 

          if(normalizedWebhook.media.dualEnhancedVideoUrl){
              isEnhancedVideoReadyAndAvailable = await waitForVideoReady(
                normalizedWebhook.media.dualEnhancedVideoUrl,
                null,
                15,
                normalizedWebhook
              );
          }          
      }    

      // ── 6. ALWAYS refresh URLs from fresh metadata before sending ─────────
      // Critical: signed S3 URLs expire in 600s. After all the waiting above
      // (up to 15 min for raw video), the original URLs will be stale.
      logger.info('Refreshing video URLs from fresh metadata before sending...');
      const freshMetaData = await getVideoMetaData(normalizedWebhook);

          

      // Refresh plain URLs from latest metadata
      if (freshMetaData) {
        const videos = freshMetaData?.driver_performance_event?.camera_media?.downloadable_videos;
        normalizedWebhook.media.forwardVideoUrl = videos?.front_facing_plain_url ?? null;
        normalizedWebhook.media.inwardVideoUrl = videos?.driver_facing_plain_url ?? null;

        // Also refresh the dual enhanced URL if we had one
        if (normalizedWebhook.media.dualEnhancedVideoUrl) {
          normalizedWebhook.media.dualEnhancedVideoUrl = videos?.dual_facing_enhanced_url ?? null;
        }

      }
      

      const hasVideo =
        normalizedWebhook?.media?.forwardVideoUrl ||
        normalizedWebhook?.media?.inwardVideoUrl || 
        normalizedWebhook.media.dualEnhancedVideoUrl;


      // ── 7. Sub-events ─────────────────────────────────────────────────────

      if(requestBody?.sub_events?.length>0){

        let subEvents = requestBody.sub_events;

        for(let subEvent of subEvents){
            const subEventForwardVideoUrl = subEvent?.camera_media?.downloadable_videos?.front_facing_plain_url;
            const subEvenInwardVideoUrl = subEvent?.camera_media?.downloadable_videos?.driver_facing_plain_url;

            if(subEventForwardVideoUrl && subEvenInwardVideoUrl){
              await sendVideosAsMediaGroupStream(
                normalizedWebhook.eventId, 
                normalizedWebhook.startTime,
                subEventForwardVideoUrl,
                subEvenInwardVideoUrl,
                null,
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


      
      // ── 8. Send to Telegram ───────────────────────────────────────────────
      if( isEnhancedVideoReadyAndAvailable || isRawVideoReadyAndAvailable  || hasVideo){

        await sendVideosAsMediaGroupStream(
          normalizedWebhook.eventId,
          normalizedWebhook.startTime,
          normalizedWebhook.media.forwardVideoUrl,
          normalizedWebhook.media.inwardVideoUrl,
          normalizedWebhook.media.dualEnhancedVideoUrl,
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
      

    //  await makeApiRequest({
    //   url : 'https://n8n-octopus.com/webhook/07582a59-70cd-4fda-a07c-b0c51022adc0',
    //   method : 'POST',
    //   body : normalizedWebhook
    // });


      
      



      //logger.debug("Video request response", JSON.stringify(normalizedWebhook));




    } catch (err) {
      logger.error("Failed to process Motive webhook", err);
      logger.debug("Payload", requestBody);
    }
  })();
  
  

  // Always respond quickly to webhooks
  
}
