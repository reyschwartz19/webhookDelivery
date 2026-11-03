import { Router } from "express";
import { publishEventController } from "./events.controller.js";
import { authenticateKey } from "../../middleware/apiKey.middleware.js";

const eventRouter = Router()

eventRouter.post("/events", authenticateKey, publishEventController)

export default eventRouter