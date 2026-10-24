import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { createEndpoint, editEndpoint, deleteEndpoint, addEndpointSubscribedEvent, getAllEndpoints, getEndpointById } from "./endpoint.service.js";
import { BadRequestError } from "../../AppError.js";
import { addEndpointEventSchema, createEndpointSchema, updateEndpointSchema, } from "../../schema/endpointInput.schema.js";
import z from "zod";

export const createEndpointController = catchAsync(async(req: Request, res: Response)=>{
    const userId = req.user!.userId;
    const input = createEndpointSchema.parse(req.body)
    const endpoint = await createEndpoint(input.url,input.events, userId)
    res.status(201).json({endpoint})
}); 

export const editEndpointcontroller = catchAsync(async(
    req: Request,
    res: Response
  )=>{
    const userId = req.user!.userId
    const input = updateEndpointSchema.parse(req.body)
    const endpointId = z.uuid().parse(req.params.endpointId); 
     //Because ts treats req.params.endpoint as string | string[]
     if (typeof endpointId !== "string") {
        throw new BadRequestError("Invalid endpoint ID");
    }
    const updatedEndpoint = await editEndpoint(userId, endpointId, input )
    res.status(200).json({updatedEndpoint})
})

export const deleteEndpointController = catchAsync (async(
    req: Request,
    res: Response
) => {
    const userId = req.user!.userId;
    const { endpointId } = req.params;
     
    //Because ts treats req.params.endpoint as string | string[]
     if (typeof endpointId !== "string") {
        throw new BadRequestError("Invalid endpoint ID");
    }
    
    await deleteEndpoint(userId, endpointId);

    res.status(204).send();
});

export const addEventController = catchAsync(async(req: Request, res: Response)=>{
    const userId = req.user!.userId
    const endpointId = z.uuid().parse(req.params.endpointId)
    const input = addEndpointEventSchema.parse(req.body)
 

    const newSubscribedEvent =await addEndpointSubscribedEvent(userId,endpointId,input.eventType)
     res.status(200).json({newSubscribedEvent})
})


export const getAllEndpointsController = catchAsync(
    async (req: Request, res: Response) => {
        const userId = req.user!.userId;

        const endpoints = await getAllEndpoints(userId);

        res.status(200).json({ endpoints });
    }
);

export const getEndpointByIdController = catchAsync(
    async (req: Request, res: Response) => {
        const userId = req.user!.userId;
        const endpointId = z.uuid().parse(req.params.endpointId);

        const endpoint = await getEndpointById(
            userId,
            endpointId
        );

        res.status(200).json({ endpoint });
    }
);
