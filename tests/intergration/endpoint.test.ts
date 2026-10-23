import { beforeEach, describe, expect, it } from "vitest";
import prisma from "../../src/lib/prisma";
import { cleanDatabase } from "../helpers/database";
import { createTestUser } from "../helpers/users";
import {addEndpointSubscribedEvent, createEndpoint,editEndpoint} from "../../src/modules/endpoint/endpoint.service"
import { ConflictError, NotFoundError } from "../../src/AppError";


beforeEach(async()=>{
    await cleanDatabase();
})

describe("Endpoint creation intergration", () => {
    it("creates a valid endpoint", async ()=>{
       const user = await createTestUser();

       const result = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )

       const endpoint = await prisma.endpoint.findUnique({
        where: {
            endpointId: result.id
        }
       })

       expect(endpoint).not.toBeNull()
       expect(result.id).toBe(endpoint?.endpointId);
       expect(endpoint?.userId).toBe(user.userId);
       expect(endpoint?.url).toBe("https://example.webhook.com");
       expect(endpoint?.subscribedEvents).toEqual(["payment.completed"]);
       expect(endpoint?.isActive).toBe(true)


    })

    it("rejects duplicate endpoint url", async ()=>{
        const user = await createTestUser();

        await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )

     

       await expect(
          createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )
       ).rejects.toThrow(ConflictError)
    })

    it("registers same url for 2 different users", async () => {
        const user1 =  await createTestUser();
        const user2 = await createTestUser();

         const result1 = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user1.userId
       )

       const endpoint1 = await prisma.endpoint.findUnique({
        where: {
            endpointId: result1.id
        }
       })
        const result2 = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user2.userId
       )

       const endpoint2 = await prisma.endpoint.findUnique({
        where: {
            endpointId: result2.id
        }
       })


       expect(endpoint1).not.toBeNull()
       expect(result1.id).toBe(endpoint1?.endpointId);
       expect(endpoint1?.userId).toBe(user1.userId);


       expect(endpoint2).not.toBeNull()
       expect(result2.id).toBe(endpoint2?.endpointId);
       expect(endpoint2?.userId).toBe(user2.userId);

       expect(endpoint1?.endpointId).not.toBe(endpoint2?.endpointId);
    })

    it("Registers same soft deleted url", async()=>{
        const user = await createTestUser();

        const endpoint1 = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
        )

        await prisma.endpoint.update({
            where: {
                endpointId: endpoint1.id
            },
            data: {
                deletedAt: new Date()
            }
        })

        const endpoint2 = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
        )

        expect(endpoint2).not.toBeNull();
        expect(endpoint2.id).not.toBe(endpoint1.id);
        expect(endpoint2?.url).toBe("https://example.webhook.com");
    })

    it("prevents concurrent duplicate endpoint registration", async () => {
    const user = await createTestUser();

    const url = "https://example.webhook.com";
    const events = ["payment.completed"];

    const results = await Promise.allSettled([
        createEndpoint(url, events, user.userId),
        createEndpoint(url, events, user.userId)
    ]);

    const fulfilled = results.filter(r => r.status === "fulfilled");
    const rejected = results.filter(r => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    expect(rejected[0].reason).toBeInstanceOf(ConflictError);

    const endpointCount = await prisma.endpoint.count({
    where: {
        userId: user.userId,
        url,
        deletedAt: null
    }
    });

expect(endpointCount).toBe(1);
   });
})

describe("Endpoint update intergration", ()=>{
    it("Updates endpoint url,events and activity", async ()=>{
        const user = await createTestUser();

        const endpoint = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )

       const result = await editEndpoint(
        user.userId,
        endpoint.id,
        {
            url: "https://newexample.com/webhook",
            events: ["order.created"],
            isActive: false
        }
        )

        expect(result.url).toBe("https://newexample.com/webhook");
        expect(result.events).toEqual(["order.created"]);
        expect(result.isActive).toBe(false);
    })

    it("Updates only url", async()=>{
        const user = await createTestUser();

        const endpoint = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )

       const result = await editEndpoint(
        user.userId,
        endpoint.id,
        {
            url: "https://newexample.com/webhook",
        }
        )
        expect(result.url).toBe("https://newexample.com/webhook")
        expect(result.events).toEqual(["payment.completed"]);
        expect(result.isActive).toBe(true);
    })

    it("Updates only event", async()=>{
        const user = await createTestUser();

        const endpoint = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )

       const result = await editEndpoint(
        user.userId,
        endpoint.id,
        {
            events: ["order.created"],
        }
        )
        expect(result.url).toBe("https://example.webhook.com")
        expect(result.events).toEqual(["order.created"]);
        expect(result.isActive).toBe(true);
    })
    
    it("Updates only activity", async()=>{
        const user = await createTestUser();

        const endpoint = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )

       const result = await editEndpoint(
        user.userId,
        endpoint.id,
        {
            isActive: false,
        }
        )
        expect(result.url).toBe("https://example.webhook.com")
        expect(result.events).toEqual(["payment.completed"]);
        expect(result.isActive).toBe(false);
    })

    it("Throws error if endpoint doesn't exist", async()=>{
        const user = await createTestUser();

       await expect(  
        editEndpoint(
        user.userId,
        "endpoint.id",
        {
            url: "https://newexample.com/webhook",
            events: ["order.created"],
            isActive: false
        }
        )
        ).rejects.toThrow(NotFoundError)
    })

    it("Throws error if endpoint belongs to another user", async()=>{
        const user = await createTestUser();

        const endpoint = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )

       await expect(
        editEndpoint(
        "user.userId",
        endpoint.id,
        {
            url: "https://newexample.com/webhook",
            events: ["order.created"],
            isActive: false
        }
        )
        ).rejects.toThrow(NotFoundError)
    })

    it("Throws error if endpoint was soft deleted", async()=>{
        const user = await createTestUser();

        const endpoint = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )

       await prisma.endpoint.update({
        where: {
            userId: user.userId,
            endpointId: endpoint.id
        }, data: {
            deletedAt: new Date()
        }
       })

       await expect(
        editEndpoint(
        user.userId,
        endpoint.id,
        {
            url: "https://newexample.com/webhook",
            events: ["order.created"],
            isActive: false
        }
        )
        ).rejects.toThrow(NotFoundError)
    })

    it("Throws error if endpoint already exists", async() =>{
        
        const user = await createTestUser();

        await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )

       const endpoint2 = await createEndpoint(
        "https://newExample.webhook.com",
        ["payment.completed"],
        user.userId
       )

       await expect(
        editEndpoint(
        user.userId,
        endpoint2.id,
        {
            url: "https://example.webhook.com",
            events: ["order.created"],
            isActive: false
        }
        )
        ).rejects.toThrow(ConflictError)
    })

  
})

describe("adding subscibedEvent to Endpoint", ()=>{
    it("adds event to endpoint", async () =>{
        const user = await createTestUser();

        const endpoint = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )

       const result = await addEndpointSubscribedEvent(
        user.userId,
        endpoint.id,
        "order.created"
        )

        
        expect(result.subscribedEvents).toEqual(["payment.completed","order.created"]);
        
    })

    it("Throws error if event already exists", async () =>{
        const user = await createTestUser();

        const endpoint = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )

       await expect(
        addEndpointSubscribedEvent(
        user.userId,
        endpoint.id,
        "payment.completed"
        )
       ).rejects.toThrow(ConflictError)
    })

    it("Prevents concurrent duplicate subscibed event additions", async () =>{
        const user = await createTestUser();

        const endpoint = await createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        user.userId
       )

       const results =  await Promise.allSettled([
        addEndpointSubscribedEvent(user.userId, endpoint.id, "order.created"),
        addEndpointSubscribedEvent(user.userId, endpoint.id, "order.created")
       ])

       const fulfilled = results.filter(r => r.status === "fulfilled");
       const rejected = results.filter(r => r.status === "rejected");

       expect(fulfilled).toHaveLength(1);
       expect(rejected).toHaveLength(1);

       expect(rejected[0].reason).toBeInstanceOf(ConflictError);

       const endResult = await prisma.endpoint.findUnique({
        where: {
            endpointId: endpoint.id
        }
        
       })

       expect(
    endResult?.subscribedEvents.filter(
        event => event === "order.created"
    )
).toHaveLength(1);
    })
})

