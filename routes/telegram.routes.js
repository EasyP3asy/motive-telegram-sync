import { Router } from "express";
import { handleTelegramUpdate } from "../controllers/telegramWebhook.controller.js";

const router = Router();

router.post("/webhook", handleTelegramUpdate);

export default router;
