import prisma from "../../lib/prisma.js"
import type { PublishEventInput } from "./events.schema.js"

export const publishEvent = async(
    userId: string,
    input: PublishEventInput
) =>{
    return await prisma.$transaction(async(tx)=>{
        const event = await tx.event.create({
            data: {
                userId,
                eventType: input.type,
                payload: input.payload
            }
        })
        
        const endpoints = await tx.endpoint.findMany({
        where: {
            userId,
            isActive: true,
            deletedAt: null,
            subscribedEvents: {
                has: input.type
            }
        },
        select: {
            endpointId: true
        }
        })

        const now = new Date

        const deliveryData = endpoints.map((endpoint)=>({
            eventId: event.eventId,
            endpointId: endpoint.endpointId,
            nextAttemptAt: now
        }));

        if(deliveryData.length > 0) {
            await tx.delivery.createMany({
                data: deliveryData
            })
        }

        return {
            eventId: event.eventId,
            eventType: event.eventType,
            deliveryCount: deliveryData.length
        }

    })    
}