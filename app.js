import express from "express";
import { routes } from "./routes/index.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import telegramRoutes from "./routes/telegram.routes.js";

export function createApp() {
  const app = express();


  app.use(express.json());
  
  // Routes
  app.use("/", routes); 
  app.use("/telegram", telegramRoutes);

  // 404 + error handler should be last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
