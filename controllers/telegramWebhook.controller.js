import { logger } from "../utils/logger.js";
import { processTelegramMessageWebhook } from "../services/telegram/telegramWebhookParser.service.js";
import { getVideoMetaDataUsingId, makeApiRequest } from  "../services/motive/motiveVideoRequestService.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export async function handleTelegramUpdate(req, res) {
 
  res.json({ ok: true });

  const requestBody = req.body;

   void (async () => {
      try {
         const normalizedWebhook = await processTelegramMessageWebhook(requestBody);
         if(!normalizedWebhook) throw new Error("No telegram user message");

         if(!normalizedWebhook.motiveId) throw new Error("No Motive ID To update");
         
         const videoMetaData = await getVideoMetaDataUsingId(normalizedWebhook.motiveId);         
         if(!videoMetaData) throw new Error("Telegram error :  No Video MetaData To Update Event");


         const performanceEventId = videoMetaData?.driver_performance_event?.driver_performance_metadata?.id;
         if (!performanceEventId) throw new Error("No performanceEventId found in video metadata");
        
         normalizedWebhook.eventId = performanceEventId;

         const eventStatusUpdateURL = `https://api.keeptruckin.com/api/w2/driver_performance/events/${normalizedWebhook.motiveId}/driver_performance_metadata/${normalizedWebhook.eventId}`;
         
         const body = getBody(normalizedWebhook);



         await makeApiRequest({
            url: eventStatusUpdateURL,
            method: 'PUT',
            body,
            headers: {
              'x-web-user-auth': env.MOTIVE_X_WEB_USER_AUTH,
            },
         });
         
         
        if(normalizedWebhook.type && normalizedWebhook.type.toLowerCase() != "dismissed" ){
          
          if(normalizedWebhook.note){
              const eventNoteUpdateUrl = `https://api.keeptruckin.com/api/w2/driver_performance/events/${normalizedWebhook.motiveId}/notes`;

              const noteBody = {
                body : normalizedWebhook.note,
                is_visible_to_driver:false
              };


              await makeApiRequest({
                  url: eventNoteUpdateUrl,
                  method: 'POST',
                  body:noteBody,
                  headers: {
                    'x-web-user-auth': env.MOTIVE_X_WEB_USER_AUTH,
                  },
              });
          }
          
          if(normalizedWebhook.severity){
              const severityUpdateUrl = `https://api.keeptruckin.com/api/w2/driver_performance/events/${normalizedWebhook.motiveId}`;

              const severityBody = {
                id : normalizedWebhook.motiveId,
                risk_level: normalizedWebhook.severity.toLowerCase(),
              };

              await makeApiRequest({
                  url: severityUpdateUrl,
                  method: 'PUT',
                  body:severityBody,
                  headers: {
                    'x-web-user-auth': env.MOTIVE_X_WEB_USER_AUTH,
                  },
              });
          }
         

        }
        

      } catch (err) {
      logger.error("Failed to process Motive webhook", err);
      logger.debug("Payload", requestBody);
    }
  })();


 

}


function getBody(normalizedWebhook){
      const type = normalizedWebhook.type?.toLowerCase();
      const note = normalizedWebhook.note || "No reason";
      const body ={};

      switch(type){
        case "dismissed":
          body.coaching_status = "uncoachable";
          body.dismissal_reasons = [note];
        break;
        case "coached":
          body.coaching_status = "coached";          
        break;
        case "coachable":
          body.coaching_status = "coachable";          
        break;
      }

      return body;
}
