import prisma from "../lib/prisma.js";


export const sendWebhook = async(deliveryId: string) =>{
    
    const delivery = await prisma.delivery.findUnique({
        where:{
            deliveryId
        },
        include: {
            event: true,
            endpoint: true
        }
    })

    if(!delivery){
        throw new Error("Delivery not found")
    }
    if(delivery.status !== "PROCESSING"){
        throw new Error("Delivery is not processing")
    }
    const body = {
        id: delivery.event.eventId,
        type: delivery.event.eventType,
        payload: delivery.event.payload
    }

    try{
    const response = await fetch(delivery.endpoint.url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        redirect: "manual", //dont automatically follow redirects
        signal: AbortSignal.timeout(10000) //Abort requests aster 10 seconds
    })

    return {
    success: response.ok,
    statusCode: response.status,
    error: null
    }
    } catch(error){
        return {
            success: false,
            statusCode: null,
            error: error instanceof Error
                 ? error.message
                 : "Unknown Error"
        }
    }
}