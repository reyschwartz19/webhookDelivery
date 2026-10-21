import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { createEndpoint } from "./endpoint.service.js";
import { createEndpointSchema } from "../../schema/endpointInput.schema.js";

export const createEndpointController = catchAsync(async(req: Request, res: Response)=>{
    const userId = req.user!.userId;
    const input = createEndpointSchema.parse(req.body)
    const endpoint = await createEndpoint(input.url,input.events, userId)
    res.status(201).json({endpoint})
}); 