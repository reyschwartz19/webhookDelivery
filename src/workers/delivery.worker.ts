import prisma from "../lib/prisma.js"


export const claimNextDelivery = async()=>{

    const now = new Date()
    const delivery = await prisma.delivery.findFirst({
        where: {
            status: "PENDING",
            nextAttemptAt: {
                lte: now
            }
        },
        orderBy: {
            nextAttemptAt: "asc"
        }
    })

    if(!delivery){
        return null
    }
    const claimed = await prisma.delivery.updateMany({
        where: {
            deliveryId: delivery.deliveryId,
            status: "PENDING",
            nextAttemptAt: {
                lte: now
            }
        },
        data: {
            status: "PROCESSING"
        }
    })
    if(claimed.count === 0){
        return null
    }
    return await prisma.delivery.findUnique({
        where: {
           deliveryId: delivery.deliveryId
        }
    })
}