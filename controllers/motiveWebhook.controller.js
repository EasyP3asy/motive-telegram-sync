
import { logger } from "../utils/logger.js";
import { processMotiveWebhook } from "../services/motive/motiveWebhookParser.service.js";
import { requestVideo , getVideoMetaData , waitForVideoReady ,requestEnhancedDualVideo , waitForEnhancedVideoURLReady, makeApiRequest } from  "../services/motive/motiveVideoRequestService.js";
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
      let rawVideoRequestResponse = null;
      let enhancenVideoRequestResponse = null;     
      let isRawVideoReadyAndAvailable = false;
      let videoMetaData = null;
      let isEnhancedVideoReadyAndAvailable = false;
      
      rawVideoRequestResponse = await requestVideo(normalizedWebhook,null,'POST');
      videoMetaData = await getVideoMetaData(normalizedWebhook);

      if(rawVideoRequestResponse !== 201 ){
        logger.error('Raw Video Request responded with code : ',rawVideoRequestResponse ) ;              
      }

      if(videoMetaData){
        normalizedWebhook.media.forwardVideoUrl = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos?.front_facing_plain_url;
        normalizedWebhook.media.inwardVideoUrl = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos?.driver_facing_plain_url;
      }else{
        logger.info('No Video Meta Data ' , videoMetaData) ;
      }
      

      if(rawVideoRequestResponse === 201 && normalizedWebhook.media.forwardVideoUrl && !requestBody?.sub_events){         
        isRawVideoReadyAndAvailable = await waitForVideoReady(normalizedWebhook.media.forwardVideoUrl);  
      }else{
        logger.info('No Video URL : ', normalizedWebhook.eventId);
      }

      

      if(isRawVideoReadyAndAvailable){
        enhancenVideoRequestResponse = await requestEnhancedDualVideo(normalizedWebhook,null,'PUT');
      }

      
      if(enhancenVideoRequestResponse?.result === true){
          videoMetaData = await waitForEnhancedVideoURLReady(normalizedWebhook);
          
          normalizedWebhook.media.dualEnhancedVideoUrl = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos?.dual_facing_enhanced_url;           
          if(normalizedWebhook.media.dualEnhancedVideoUrl){
              isEnhancedVideoReadyAndAvailable = await waitForVideoReady(normalizedWebhook.media.dualEnhancedVideoUrl);
          }          
      }    

     
     

      normalizedWebhook.media.forwardVideoUrl = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos?.front_facing_plain_url;
      normalizedWebhook.media.inwardVideoUrl = videoMetaData?.driver_performance_event?.camera_media?.downloadable_videos?.driver_facing_plain_url;
      


     


      
       

          




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


      
      
      if(isEnhancedVideoReadyAndAvailable || isRawVideoReadyAndAvailable  || hasVideo){

        await sendVideosAsMediaGroup(
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
  return res.json({ ok: true });
}
