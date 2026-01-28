
import axios from "axios";
import {env} from "../../config/env.js";

export async function requestVideo(payload,body = null,method) {
    const url = `${env.MOTIVE_BASE_URL}/api/w2/driver_performance/events/${payload.eventId}/video_attach`;
    body = body ??  {
        id:payload.eventId,
        start_time : payload.startTime,
    };

   
    return makeApiRequest({
          url,
          method: method, // optional if your helper auto-chooses GET
          body,
          headers: {
            'x-web-user-auth': env.MOTIVE_X_WEB_USER_AUTH,
          },
        });   
      
     
        
}



export async function getVideoMetaData(payload) {
  const url = `${env.MOTIVE_BASE_URL}/api/w2/driver_performance/events/${payload.eventId}`;

  return makeApiRequest({
    url,
    method: "GET",
    headers: {
      "x-web-user-auth": env.MOTIVE_X_WEB_USER_AUTH,
    },
    queryParams: {
      id: payload.eventId,
      start_time: payload.startTime, // or payload.start_time (use the one you actually have)
      include_telematics_metadata: true,
    },
  });
}




async function makeApiRequest({
  url,
  method = 'GET',
  body,                 // request body (object, string, FormData, etc.)
  headers = {},         // custom headers
  token,                // optional Bearer token
  queryParams,          // optional query-string params as object
}) {
  try {
    // --- Build final URL with query params if provided ---
    let finalUrl = url;
    if (queryParams && typeof queryParams === 'object') {
      const qs = new URLSearchParams(queryParams).toString();
      if (qs) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
      }
    }
    
    
    // --- Build headers dynamically ---
    const finalHeaders = { ...headers };
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    const options = {
      method: method.toUpperCase(),
      headers: finalHeaders,
    };

    // --- Attach body only for non-GET/HEAD methods ---
    if (body !== undefined && options.method !== 'GET' && options.method !== 'HEAD') {
      // If body is FormData, URLSearchParams, string, Blob, etc. -> send as is
      const isSpecialBody =
        body instanceof FormData ||
        body instanceof URLSearchParams ||
        typeof body === 'string' ||
        body instanceof Blob ||
        body instanceof ArrayBuffer;

      if (isSpecialBody) {
        options.body = body;
      } else {
        // Assume plain object → send as JSON
        options.body = JSON.stringify(body);

        // Only set Content-Type if user didn’t already override it
        if (!finalHeaders['Content-Type'] && !finalHeaders['content-type']) {
          finalHeaders['Content-Type'] = 'application/json';
        }
      }
    }

    const response = await fetch(finalUrl, options);

    // Try to parse JSON if possible, otherwise return text
    const contentType = response.headers.get('content-type') || '';
    const responseData = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const safeHeaders = { ...finalHeaders };
      for (const k of ["Authorization","x-api-key","x-web-user-auth"]) {
        if (safeHeaders[k]) safeHeaders[k] = "[REDACTED]";
      }
      console.error("API request failed:", {
        url: finalUrl,
        method: options.method,
        status: response.status,
        statusText: response.statusText,
        headers: safeHeaders,
        responseData,
      });
      return null;
    }

    return responseData;
  } catch (error) {
    console.error('Error in API request:', error);
    return null;
  }
}



// async function fetchWithLimit(urls, limit = 5) {
//   const results = new Array(urls.length);
//   let index = 0;

//   async function worker() {
//     while (true) {
//       const current = index++;
//       if (current >= urls.length) break;

//       const url = urls[current];

//       try {
//         const data = await makeApiRequest({
//           url,
//           method: 'GET', // optional if your helper auto-chooses GET
//           headers: {
//             'x-web-user-auth': env.MOTIVE_X_WEB_USER_AUTH,
//           },
//         });

//         if (data === null) {
//           // makeApiRequest already logged the error
//           results[current] = {
//             url,
//             error: 'Request failed (makeApiRequest returned null)',
//           };
//         } else {
//           results[current] = data; // already parsed JSON / text
//         }
//       } catch (err) {
//         results[current] = {
//           url,
//           error: err instanceof Error ? err.message : String(err),
//         };
//       }
//     }
//   }

//   const workers = Array.from(
//     { length: Math.min(limit, urls.length) },
//     () => worker()
//   );

//   await Promise.all(workers);
//   return results;
// }


export async function waitForVideoReady( normalizedWebhook,  maxTries = 8 ) {
  
    
  for (let i = 0; i < maxTries; i++) {    

    const forwardUrl = normalizedWebhook?.media?.forwardVideoUrl;
    const inwardUrl = normalizedWebhook?.media?.inwardVideoUrl;

    if (forwardUrl) {
      const probe = await probeVideoUrl(forwardUrl);
      if (probe.ok) return { forwardUrl, inwardUrl };     
    }

    await new Promise(r => setTimeout(r, 60000)); // wait 60s
  }

  return false;
}










export async function probeVideoUrl(url) {
  const res = await axios.get(url, {
    responseType: "text",
    headers: { Range: "bytes=0-1" }, // small request; often returns 206
    timeout: 15000,
    validateStatus: () => true,
  });

  if (res.status === 200 || res.status === 206) return { ok: true };

  // S3 missing key often appears as 404 with XML body containing NoSuchKey
  if (res.status === 404 && typeof res.data === "string" && res.data.includes("NoSuchKey")) {
    return { ok: false, reason: "not_ready_no_such_key" };
  }

  // Expired signed URL often 403 with "Request has expired"
  if (res.status === 403 && typeof res.data === "string" && res.data.includes("Request has expired")) {
    return { ok: false, reason: "expired" };
  }

  return { ok: false, reason: `status_${res.status}` };
}