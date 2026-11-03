
import { describe, it, expect, beforeEach  } from "vitest";
import prisma from "../../src/lib/prisma";
import { cleanDatabase } from "../helpers/database";
import { createTestUser } from "../helpers/users";
import { createEndpoint } from "../../src/modules/endpoint/endpoint.service";
import {publishEvent} from "../../src/modules/events/events.service"


let user: Awaited<ReturnType<typeof createTestUser>>


beforeEach(async()=>{
    await cleanDatabase();
    user = await createTestUser()
})



describe("Event creation intergration", ()=>{
    it("Publishes an event with one subscriber", async()=>{
       

        const endpoint = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )
       
       const result = await publishEvent(user.userId, {
          type: "payment.completed",
          payload: {
          paymentId: "pay_123",
          amount: 5000
       }
       })

       const savedEvent = await prisma.event.findUnique({
        where: {
            eventId: result.eventId
        }
       })

       expect(savedEvent).not.toBeNull()
       expect(savedEvent?.eventType).toBe("payment.completed")
       expect(savedEvent?.payload).toEqual({
          paymentId: "pay_123",
          amount: 5000
       })

       const deliveries = await prisma.delivery.findMany({
         where: {
           eventId: result.eventId
          }
       });

       expect(deliveries).toHaveLength(1);

       expect(deliveries[0]?.endpointId).toBe(endpoint.id);

       expect(deliveries[0]?.status).toBe("PENDING"); 

       expect(result.deliveryCount).toBe(1);

    })

    it("Publishes with three subscribers", async()=>{
      
       const endpoint1 = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )
       const endpoint2 = await createEndpoint(
        "https://example2.webhook.com",
        ["payment.completed"],
        user.userId
        )
        const endpoint3 = await createEndpoint(
        "https://example3.webhook.com",
        ["payment.completed"],
        user.userId
       ) 

       const result = await publishEvent(user.userId, {
          type: "payment.completed",
          payload: {
          paymentId: "pay_123",
          amount: 5000
       }
       })

       expect(result.deliveryCount).toBe(3)
       const event = await prisma.event.findUnique({
        where: {eventId: result.eventId}
       })
       expect(event).not.toBeNull()
       const deliveries = await prisma.delivery.findMany({
        where: { eventId: result.eventId }
       })
       expect(deliveries).toHaveLength(3);
       expect(deliveries.map(d=>d.endpointId).sort()).toEqual(
        [
            endpoint1.id,
            endpoint2.id,
            endpoint3.id
        ].sort()
       )
       expect(
         deliveries.every(d => d.eventId === result.eventId)
       ).toBe(true)
       expect(
         deliveries.every(d => d.status === "PENDING")
       ).toBe(true);
       expect(
         deliveries.every(d => d.attemptCount === 0)
       ).toBe(true);


    })

    it("Publishes without subscribers",async()=>{
        

        const result = await publishEvent(user.userId, {
          type: "payment.completed",
          payload: {
          paymentId: "pay_123",
          amount: 5000
       }
       })
       const savedEvent = await prisma.event.findUnique({
        where: {
            eventId: result.eventId
        }
       })
       expect(savedEvent).not.toBeNull()
       expect(savedEvent?.eventType).toBe("payment.completed")
       expect(savedEvent?.payload).toEqual({
          paymentId: "pay_123",
          amount: 5000
       })
       const deliveries = await prisma.delivery.findMany({
         where: {
           eventId: result.eventId
          }
       });

       expect(deliveries).toHaveLength(0);
    })

    it("should not create delivery for endpoint subscribed to a different event", async()=>{
       

        const endpoint = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )
       
       const result = await publishEvent(user.userId, {
          type: "payment.incomplete",
          payload: {
          paymentId: "pay_123",
          amount: 5000
       }
       })
       const savedEvent = await prisma.event.findUnique({
        where: {
            eventId: result.eventId
        }
       })

       expect(savedEvent).not.toBeNull()
       expect(savedEvent?.eventType).toBe("payment.incomplete")
       expect(savedEvent?.payload).toEqual({
          paymentId: "pay_123",
          amount: 5000
       })
       const deliveries = await prisma.delivery.findMany({
         where: {
           eventId: result.eventId
          }
       });

       expect(deliveries).toHaveLength(0);
    })

    it("should not create deliveries for another user's endpoints", async()=>{
        const otherUser = await createTestUser()

        const ownEndpoint = await prisma.endpoint.create({
            data: {
                userId: user.userId,
                url: "https://mine.example.com/webhook",
                subscribedEvents: ["payment.completed"]
            }
        })

        await prisma.endpoint.create({
            data: {
                userId: otherUser.userId,
                url: "https://other.example.com/webhook",
                subscribedEvents: ["payment.completed"]
            }
        })

        const result = await publishEvent(user.userId, {
            type: "payment.completed",
            payload: {
                paymentId: "pay_123"
            }
        })

        const deliveries = await prisma.delivery.findMany({
            where: {
                eventId: result.eventId
            }
        })

        expect(result.deliveryCount).toBe(1)
        expect(deliveries).toHaveLength(1)
        expect(deliveries[0]?.endpointId).toBe(ownEndpoint.endpointId)
    })

    it("should exclude inactive and deleted endpoints", async()=>{
        const activeEndpoint = await prisma.endpoint.create({
            data: {
                userId: user.userId,
                url: "https://active.example.com/webhook",
                subscribedEvents: ["payment.completed"]
            }
        })

        await prisma.endpoint.createMany({
            data: [
                {
                    userId: user.userId,
                    url: "https://inactive.example.com/webhook",
                    subscribedEvents: ["payment.completed"],
                    isActive: false
                },
                {
                    userId: user.userId,
                    url: "https://deleted.example.com/webhook",
                    subscribedEvents: ["payment.completed"],
                    deletedAt: new Date()
                }
            ]
        })

        const result = await publishEvent(user.userId, {
            type: "payment.completed",
            payload: {
                paymentId: "pay_123"
            }
        })

        const deliveries = await prisma.delivery.findMany({
            where: {
                eventId: result.eventId
            }
        })

        expect(result.deliveryCount).toBe(1)
        expect(deliveries).toHaveLength(1)
        expect(deliveries[0]?.endpointId).toBe(activeEndpoint.endpointId)
    })

    it("should preserve the original event payload", async()=>{
        const payload = {
            paymentId: "pay_123",
            amount: 5000,
            customer: {
                name: "John",
                email: "john@example.com"
            },
            items: [
                { productId: "prod_1", quantity: 2 },
                { productId: "prod_2", quantity: 1 }
            ],
            successful: true
        }

        const result = await publishEvent(user.userId, {
            type: "payment.completed",
            payload
        })

        const event = await prisma.event.findUnique({
            where: {
                eventId: result.eventId
            }
        })

        expect(event).not.toBeNull()
        expect(event?.payload).toEqual(payload)
        expect(event?.eventType).toBe("payment.completed")
    })

    it.todo("should roll back event creation if delivery creation fails")
})
