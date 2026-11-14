import {beforeEach, it, describe, expect, vi} from "vitest"
import prisma from "../../src/lib/prisma.js"
import { cleanDatabase } from "../helpers/database.js"
import { createTestUser } from "../helpers/users.js"
import { createEndpoint } from "../../src/modules/endpoint/endpoint.service.js"
import { publishEvent } from "../../src/modules/events/events.service.js"
import {claimNextDelivery} from "../../src/workers/delivery.worker.js"
import {sendWebhook} from "../../src/workers/webhook.sender.js"

let user: Awaited<ReturnType<typeof createTestUser>>


beforeEach(async()=>{
    await cleanDatabase();
    user = await createTestUser()
})

const fetchMock = vi.spyOn(globalThis, "fetch")



// fetchMock.mockRejectedValue(
//     new Error("Connection refused")
// )

describe("delivery http request intergration", ()=>{
    it("Returns success body after request", async()=>{
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
         const result = await sendWebhook(claimedDelivery!.deliveryId)
         expect(fetchMock).toHaveBeenCalledWith(
            "https://example.webhook.com",
            expect.objectContaining({
                method: "POST"
            })
         )
         expect(result.success).toBe(true)
         expect(result.statusCode).toBe(200)
         expect(result.error).toBeNull()

         const [url, options] = fetchMock.mock.calls[0]!

         const body = JSON.parse(options!.body as string)
         expect(body.type).toBe("payment.completed")

         expect(body.payload).toEqual({
            paymentId: "pay_123",
            amount: 5000
         })
         expect(body.id).toEqual(expect.any(String))

    })

})