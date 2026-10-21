import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.middleware.js";
import { createEndpointController } from "./endpoint.controller.js";

const endpointRouter = Router()

endpointRouter.post("/createEndpoint", authenticateToken, createEndpointController)

export default endpointRouter;