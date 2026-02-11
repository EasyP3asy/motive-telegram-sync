

function capAfterSpaces(str = "") {
  return str
    .split(" ")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function mapMotiveWebhook(payload) {

  const eventId = payload?.id ?? null;
  const eventType = payload?.action ?? null;  

  const companyId = payload?.company_id ?? null;
  const companyName = payload?.company_name ?? null;

  const driverId = payload?.driver_id ?? null;
  const driverFirstName = payload?.current_driver?.first_name ?? null;
  const driverLastName = payload?.current_driver?.last_name ?? null;
  const driverFullName =
  (driverFirstName || driverLastName)
    ? capAfterSpaces(`${driverFirstName ?? ""} ${driverLastName ?? ""}`.trim())
    : null;

  const vehicleId = payload?.vehicle_id ?? null;
  const vehicleNumber =
    payload?.current_vehicle?.number ??
    null;

  const severity =
    payload?.metadata?.severity ? 
    capAfterSpaces(String(payload.metadata.severity)) : null;
    

  const location = payload?.location ?? null;
  const latitude = payload?.lat ?? null;
  const longitude = payload?.lon ?? null;

  const duration = payload?.camera_media?.duration ?? null;
  const startTime = payload?.start_time ?? null; 
  const formattedTimestamp = startTime ? formatToEasternTime(startTime) : null;   
   

  // Media (video)
  const forwardVideoUrl = payload?.camera_media?.downloadable_videos?.front_facing_plain_url ?? null;
  const inwardVideoUrl = payload?.camera_media?.downloadable_videos?.driver_facing_plain_url ?? null;
  //  (Image)
  const inwardJPGUrl = payload?.camera_media?.downloadable_images?.driver_facing_jpg_url ?? null;
  const forwardJPGUrl = payload?.camera_media?.downloadable_images?.front_facing_jpg_url ?? null;

  const alertId = payload?.metadata?.id?.[0];
  const alertType = payload?.type ?? null;
  const parsedAlertType = alertType ? eventTypeParse(alertType) : null;

  const minSpeed = toNumberOrNull(payload.min_speed);
  const maxSpeed = toNumberOrNull(payload.max_speed) ;
  let speedRange = null;

  if (Number.isFinite(minSpeed) && Number.isFinite(maxSpeed)) {
      speedRange = kphToMphRounded(minSpeed,0) + " - " + kphToMphRounded(maxSpeed,0) + " mph"; 
  }






  return {
    eventId,
    eventType,
    companyId,
    companyName,
    driverId,
    driverFirstName,
    driverLastName,
    driverFullName,
    vehicleId,
    vehicleNumber,
    severity,
    location,
    latitude,
    longitude,
    duration,
    startTime,
    formattedTimestamp,
    alertId,
    parsedAlertType,
    media: {
      forwardVideoUrl,
      inwardVideoUrl,
      forwardJPGUrl,
      inwardJPGUrl,
      dualEnhancedVideoUrl : null
    },
    minSpeed,
    maxSpeed,
    speedRange,    
  };
}




function formatToEasternTime(input) {
  const date = new Date(input);

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',       // "May"
    day: 'numeric',      // "2"
    year: 'numeric',     // "2025"
    hour: 'numeric',     // "2"
    minute: '2-digit',   // "07"
    hour12: true,        // "PM"
    timeZoneName: 'short' // "EDT"
  }).format(date);
}

function kphToMph(kph) {
  if (typeof kph !== "number" || !Number.isFinite(kph)) {
    throw new TypeError("kph must be a finite number");
  }
  const KM_TO_MILES = 0.621371; // 1 km ≈ 0.621371 miles
  return kph * KM_TO_MILES;
}


function kphToMphRounded(kph, decimals = 2) {
  const mph = kphToMph(kph);
  const p = 10 ** decimals;
  return Math.round(mph * p) / p;
}


function eventTypeParse(alertType){

  

  switch(alertType.toLowerCase()){
      case "tailgating":
        alertType = "Close following";
      break;
      case "manual_event":
        alertType = "Driver capture";
      break;
      case "cell_phone":
          alertType = "Cell phone usage";
      break;
      case "stop_sign_violation":
          alertType = "Stop sign violation";
      break;
      case "unsafe_lane_change":
          alertType = "Unsafe lane change";
      break;
      case "unsafe_parking":
          alertType = "Unsafe parking";
      break;
      case "seat_belt_violation":
          alertType = "Seat belt violation";
      break;
      case "driver_facing_cam_obstruction":
          alertType = "Face Cam Obstruction";
      break;
      default:
          alertType = alertType.replaceAll('_',' ');
    }

    return alertType;

}



function toNumberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};