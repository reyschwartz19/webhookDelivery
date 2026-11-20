import prisma from "../lib/prisma.js"
import { sendWebhook } from "./webhook.sender.js"

export const processDelivery = async(deliveryId: string)=>{
    const result = await sendWebhook(deliveryId)
    
    return await prisma.$transaction(async(tx)=>{

        const updated = await tx.delivery.updateMany({
            where: {
                deliveryId,
                status: "PROCESSING"
            },
            data: result.success
              ? {
                status: "DELIVERED",
                attemptCount: {
                    increment: 1
                },
                nextAttemptAt: null
              }
              : {
                attemptCount: {
                    increment: 1
                }
              }
        })
        if(updated.count !== 1){
            throw new Error("Delivery is no longer processing")
        }

        await tx.deliveryAttempt.create({
            data: {
                deliveryId,
                statusCode: result.statusCode,
                error: result.error
            }
        })
    })
}