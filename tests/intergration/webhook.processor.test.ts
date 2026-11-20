import {beforeEach, it, describe, expect, vi} from "vitest"
import prisma from "../../src/lib/prisma.js"
import { cleanDatabase } from "../helpers/database.js"
import { createTestUser } from "../helpers/users.js"
import { createEndpoint } from "../../src/modules/endpoint/endpoint.service.js"
import { publishEvent } from "../../src/modules/events/events.service.js"
import {claimNextDelivery} from "../../src/workers/delivery.worker.js"
import {processDelivery} from "../../src/workers/delivery.processor.js"

let user: Awaited<ReturnType<typeof createTestUser>>


beforeEach(async()=>{
    await cleanDatabase();
    user = await createTestUser()
})

const fetchMock = vi.spyOn(globalThis, "fetch")

describe("Delivery processor intergration", ()=>{
    it("Reflects 1 succesful http attempt on db", async()=>{
       fetchMock.mockResolvedValue({
    ok: true,
    status: 200
    }as Response)
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
        const claimedDelivery = await claimNextDelivery()
        expect(claimedDelivery).not.toBeNull()
        
        const deliveryId = claimedDelivery!.deliveryId
        await processDelivery(deliveryId)

        const delivery = await prisma.delivery.findUnique({
            where: {
                deliveryId
            },
            include : {
                deliveryAttempts: true
            }
        })

        expect(delivery?.status).toBe("DELIVERED")
        expect(delivery?.attemptCount).toBe(1)
        expect(delivery?.nextAttemptAt).toBeNull()

        expect(delivery?.deliveryAttempts).toHaveLength(1)
        expect(delivery?.deliveryAttempts[0]?.statusCode).toBe(200)
        
    })
    it("records a failed HTTP attempt", async()=>{
        fetchMock.mockResolvedValue({
            ok: false,
            status: 500
        }as Response)
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
          const claimedDelivery = await claimNextDelivery()
          expect(claimedDelivery).not.toBeNull()
        
        const deliveryId = claimedDelivery!.deliveryId
        await processDelivery(deliveryId)

        const delivery = await prisma.delivery.findUnique({
            where: {
                deliveryId
            },
            include : {
                deliveryAttempts: true
            }
        })

       

        expect(delivery?.status).toBe("PROCESSING")
        expect(delivery?.attemptCount).toBe(1)
        expect(delivery?.nextAttemptAt).not.toBeNull()

        expect(delivery?.deliveryAttempts).toHaveLength(1)
        expect(delivery?.deliveryAttempts[0]?.statusCode).toBe(500)
        

    })
})