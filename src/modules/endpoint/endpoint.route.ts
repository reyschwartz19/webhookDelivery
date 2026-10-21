import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.middleware.js";
import { createEndpointController, editEndpointcontroller, deleteEndpointController } from "./endpoint.controller.js";

const endpointRouter = Router()

endpointRouter.post("/createEndpoint", authenticateToken, createEndpointController)
endpointRouter.patch("/editEndpoint/:endpointId", authenticateToken, editEndpointcontroller)
endpointRouter.delete("/deleteEndpoint/:endpointId", authenticateToken, deleteEndpointController)

export default endpointRouter;