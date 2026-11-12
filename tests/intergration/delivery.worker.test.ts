import {beforeEach, it, describe, expect} from "vitest"
import prisma from "../../src/lib/prisma.js"
import { cleanDatabase } from "../helpers/database.js"
import { createTestUser } from "../helpers/users.js"
import { createEndpoint } from "../../src/modules/endpoint/endpoint.service.js"
import { publishEvent } from "../../src/modules/events/events.service.js"
import {claimNextDelivery} from "../../src/workers/delivery.worker.js"

let user: Awaited<ReturnType<typeof createTestUser>>


beforeEach(async()=>{
    await cleanDatabase();
    user = await createTestUser()
})

describe("Delivery cliam intergration", ()=>{
    it("claims a pending delivery whose schedule has arrived", async()=>{
                await createEndpoint(
                 "https://example.webhook.com",
                 ["payment.completed"],
                 user.userId
                )
                
                await publishEvent(user.userId, {
                   type: "payment.completed",
                   payload: {
                   paymentId: "pay_123",
                   amount: 5000
                }
                })
                
                const result = await claimNextDelivery()
                const delivery = await prisma.delivery.findUnique({
                    where: {
                      deliveryId: result!.deliveryId
                   }
                })
                expect(result).not.toBeNull()
                expect(delivery?.status).toBe("PROCESSING")
                expect(result?.status).toBe("PROCESSING")
                
    })

    it("Returns null when there are no pending deliveries", async()=>{
        const result = await claimNextDelivery()
         expect(result).toBeNull()
    })
    it("Returns null for future deliveries", async()=>{
        await createEndpoint(
                 "https://example.webhook.com",
                 ["payment.completed"],
                 user.userId
                )
                
                const event = await publishEvent(user.userId, {
                   type: "payment.completed",
                   payload: {
                   paymentId: "pay_123",
                   amount: 5000
                }
                })

        const futureDate = new Date(Date.now() + 5 * 60 * 1000);
        await prisma.delivery.updateMany({
            where: {
                eventId: event.eventId
            },
            data: {
                nextAttemptAt: futureDate
            }
        })

        const result = await claimNextDelivery()
        expect(result).toBeNull()

    })
    it("returns 1 succesfull claim when 2 workers attempt to claim a single delivery", async()=>{
        await createEndpoint(
                 "https://example.webhook.com",
                 ["payment.completed"],
                 user.userId
                )
                
                await publishEvent(user.userId, {
                   type: "payment.completed",
                   payload: {
                   paymentId: "pay_123",
                   amount: 5000
                }
                })
        const results = await Promise.all([
             claimNextDelivery(),
             claimNextDelivery()
        ])

        const fulfilled = results.filter(r => r !== null);
        const rejected = results.filter(r => r === null);
        
        expect(fulfilled).toHaveLength(1)
        expect(rejected).toHaveLength(1)

        expect(fulfilled[0]?.status).toBe("PROCESSING")

        const deliveries = await prisma.delivery.findMany()

        expect(deliveries).toHaveLength(1)
        expect(deliveries[0]?.status).toBe("PROCESSING")

        expect(fulfilled[0]?.deliveryId).toBe(deliveries[0]?.deliveryId)
        })
})
