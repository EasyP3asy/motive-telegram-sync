import { Router } from "express";
import { healthRoutes } from "./health.routes.js";

import { motiveRoutes } from "./motive.routes.js";

export const routes = Router();

// Simple endpoints
routes.use("/health", healthRoutes);

// Motive endpoints (webhooks, callbacks, etc.)
routes.use("/motive", motiveRoutes);
