import { ConflictError } from "../../AppError.js";
import prisma from "../../lib/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";

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