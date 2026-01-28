import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION", err);
});

process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION", err);
  
});

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
});
