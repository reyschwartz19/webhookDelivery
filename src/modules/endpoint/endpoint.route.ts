import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.middleware.js";
import { createEndpointController, editEndpointcontroller, deleteEndpointController,addEventController, getAllEndpointsController, getEndpointByIdController } from "./endpoint.controller.js";

const endpointRouter = Router()

endpointRouter.post("/createEndpoint", authenticateToken, createEndpointController)
endpointRouter.patch("/editEndpoint/:endpointId", authenticateToken, editEndpointcontroller)
endpointRouter.delete("/deleteEndpoint/:endpointId", authenticateToken, deleteEndpointController)
endpointRouter.post("/addEndpointEvent/:endpointId", authenticateToken, addEventController)
endpointRouter.get("/",authenticateToken,getAllEndpointsController)
endpointRouter.get("/:endpointId",authenticateToken,getEndpointByIdController);


export default endpointRouter;