import { ConflictError, NotFoundError } from "../../AppError.js";
import prisma from "../../lib/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { z } from "zod";
import { updateEndpointSchema } from "../../schema/endpointInput.schema.js";

export const createEndpoint = async (
    url: string,
    subscribedEvents: string[],
    userId: string
) => {
  try{

       const newEndpoint = await prisma.endpoint.create({
        data: {
            userId,
            url,
            subscribedEvents
        }
       })
       return {
        id: newEndpoint.endpointId,
        url: newEndpoint.url,
        events: newEndpoint.subscribedEvents
       }
  } catch(error: unknown){
     if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    ) {
        throw new ConflictError("Endpoint already registered");
    }

    throw error;
  }
      

}

type UpdateEndpointInput = z.infer<typeof updateEndpointSchema>;

export const editEndpoint = async (
    userId: string,
    endpointId: string,
    input: UpdateEndpointInput
) =>{
    try {
    const updatedEndpoint = await prisma.endpoint.update({
        where: {
            userId,
            endpointId,
            deletedAt: null
        },
        data: {
            url: input.url,
            subscribedEvents: input.events,
            isActive: input.isActive
        }
    })
    return {
        id: updatedEndpoint.endpointId,
        url: updatedEndpoint.url,
        events: updatedEndpoint.subscribedEvents,
        isActive: updatedEndpoint.isActive
    }
    } catch(error: unknown){
        if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
    ) {
        throw new NotFoundError("Endpoint not found");
    }

    throw error;
    }
}

export const deleteEndpoint = async (
    userId: string,
    endpointId: string,
) => {
    try {
        const updateEndpoint = await prisma.endpoint.update({
            where: {
                userId,
                endpointId,
                deletedAt: null
            },
            data : {
                deletedAt: new Date(),
                isActive: false
            }
        })
        
    } catch(error: unknown){
        if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
    ) {
        throw new NotFoundError("Endpoint not found");
    }

    throw error;
    }
}