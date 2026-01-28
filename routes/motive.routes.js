import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { handleMotiveWebhook } from "../controllers/motiveWebhook.controller.js";

export const motiveRoutes = Router();

// Example webhook endpoint
motiveRoutes.post("/", asyncHandler(handleMotiveWebhook));
