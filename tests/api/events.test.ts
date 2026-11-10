import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest"
import app from "../../src/app.js"
import { cleanDatabase } from '../helpers/database.js';
import { createAuthenticatedUser } from '../helpers/users.js';
import { publishEvent } from "../../src/modules/events/events.service.js";
import { createEventTestFixture } from "../helpers/event.js";
import { createEndpoint } from "../../src/modules/endpoint/endpoint.service.js";
import prisma from "../../src/lib/prisma.js";

beforeEach(async()=>{
    await cleanDatabase();
})

describe("POST api/events", ()=>{
    it("Publishes a new event with valid apiKey and returns 201", async()=>{
      const {user, endpoint, apiKey} = await createEventTestFixture()

      const response = await request(app)
         .post("/api/events")
         .set("x-api-key", apiKey)
         .send({
            type: "payment.completed",
            payload: {
                paymentId: "pay_123",
                amount: 5000
            }
         })
      

         expect(response.status).toBe(201)
         expect(response.body.eventType).toBe("payment.completed")
         expect(response.body.deliveryCount).toBe(1)
         expect(response.body.eventId).toBeDefined()
    })

    it("Returns 401 for missing APi key", async()=>{
        const {user, endpoint, apiKey} = await createEventTestFixture()
        const response = await request(app)
           .post("/api/events")
           .send({
            type: "payment.completed",
            payload: {
                paymentId: "pay_123",
                amount: 5000
            }
         })
         expect(response.status).toBe(401)
    })

    it("Returns 401 for invalid APi key", async()=>{
        const {user, endpoint, apiKey} = await createEventTestFixture()
        const response = await request(app)
           .post("/api/events")
           .set("x-api-key", "12344")
           .send({
            type: "payment.completed",
            payload: {
                paymentId: "pay_123",
                amount: 5000
            }
         })
         expect(response.status).toBe(401)
    })

    it("Returns 400 for invlaid event body", async()=>{
      const {user, endpoint, apiKey} = await createEventTestFixture()

      const response = await request(app)
         .post("/api/events")
         .set("x-api-key", apiKey)
         .send({
            type: "payment.completed",
         })
      

         expect(response.status).toBe(400)
         
    })
    it("Publishes a new event with valid apiKey and zero subscribers", async()=>{
      const {user, endpoint, apiKey} = await createEventTestFixture()

      const response = await request(app)
         .post("/api/events")
         .set("x-api-key", apiKey)
         .send({
            type: "payment.sent",
            payload: {
                paymentId: "pay_123",
                amount: 5000
            }
         })
      

         expect(response.status).toBe(201)
         expect(response.body.eventType).toBe("payment.sent")
         expect(response.body.deliveryCount).toBe(0)
         expect(response.body.eventId).toBeDefined()
    })
    it("Publishes a new event with valid apiKey and multiple subscribers", async()=>{
      const {user, endpoint, apiKey} = await createEventTestFixture()
      
      const secondEnpoint = await createEndpoint(
        "https://example2.webhook.com",
        ["payment.completed"],
        user.userId
      )
      const response = await request(app)
         .post("/api/events")
         .set("x-api-key", apiKey)
         .send({
            type: "payment.completed",
            payload: {
                paymentId: "pay_123",
                amount: 5000
            }
         })
      

         expect(response.status).toBe(201)
         expect(response.body.deliveryCount).toBe(2)

         const deliveries = await prisma.delivery.findMany({
        where: {
            eventId: response.body.eventId
        }
    })

    expect(deliveries).toHaveLength(2)
         expect(deliveries.map(d=>d.endpointId).sort()).toEqual(
        [
            endpoint.id,
            secondEnpoint.id
        ].sort()
    )
         expect(response.body.eventId).toBeDefined()
         expect(
        deliveries.every(d=>d.status === "PENDING")
        ).toBe(true)
    })
    
    
})