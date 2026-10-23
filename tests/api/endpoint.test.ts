import {beforeEach, describe, expect, it} from 'vitest';
import request from "supertest"
import app from "../../src/app.js"
import { cleanDatabase } from '../helpers/database.js';
import { createAuthenticatedUser } from '../helpers/users.js';
import { createEndpoint } from "../../src/modules/endpoint/endpoint.service.js";

beforeEach(async()=>{
    await cleanDatabase();
})



describe("POST api/endpoint/createEndpoint",()=>{
    it("Creates new Endpoint and returns 201", async()=>{
      
       const {accessToken} = await createAuthenticatedUser();

        const response = await request(app)
              .post("/api/endpoint/createEndpoint")
              .set("Authorization", `Bearer ${accessToken}`)
              .send({
                 url: "https://example.webhook.com",
                 events: ["payment.completed"],
                }
              );
        
        expect(response.status).toBe(201);
        expect(response.body.endpoint.id).toBeDefined()
        expect(response.body.endpoint.url).toBe(
            "https://example.webhook.com"
        )
        expect(response.body.endpoint.events).toEqual([
            "payment.completed"
        ])
    })

    it("Returns 401 when user isn't authenticated", async()=>{
        const response = await request(app)
              .post("/api/endpoint/createEndpoint")
              .send({
                 url: "https://example.webhook.com",
                 events: ["payment.completed"],
                }
              );
        
        expect(response.status).toBe(401);
    })
    it("Returns 400 when endpoint url doesn't follow https protocol", async()=>{
        
       const {accessToken} = await createAuthenticatedUser();

        const response = await request(app)
              .post("/api/endpoint/createEndpoint")
              .set("Authorization", `Bearer ${accessToken}`)
              .send({
                 url: "http://example.webhook.com",
                 events: ["payment.completed"],
                }
              );
        
        expect(response.status).toBe(400);
    })
    it("Returns 400 when endpoint url is empty", async()=>{
           
       const {accessToken} = await createAuthenticatedUser();

        const response = await request(app)
              .post("/api/endpoint/createEndpoint")
              .set("Authorization", `Bearer ${accessToken}`)
              .send({
                 url: "",
                 events: ["payment.completed"],
                }
              );
        
        expect(response.status).toBe(400);
    })
    it("Returns 400 when endpoint event is empty", async()=>{
           
       const {accessToken} = await createAuthenticatedUser();

        const response = await request(app)
              .post("/api/endpoint/createEndpoint")
              .set("Authorization", `Bearer ${accessToken}`)
              .send({
                 url: "https://example.webhook.com",
                 events: [""],
                }
              );
        
        expect(response.status).toBe(400);
    })
    it("Returns 409 for duplicate endpoint", async () => {
    const { accessToken } = await createAuthenticatedUser();

    const endpointData = {
        url: "https://example.webhook.com",
        events: ["payment.completed"]
    };

   
    await request(app)
        .post("/api/endpoint/createEndpoint")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(endpointData)
        .expect(201);

    
    const response = await request(app)
        .post("/api/endpoint/createEndpoint")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(endpointData);

    expect(response.status).toBe(409);
});
})

export const createTestEndpoint = async (userId: string) => {
    return createEndpoint(
        "https://example.webhook.com",
        ["payment.completed"],
        userId
    );
};

describe("PATCH api/endpoint/editEndpoint/:endpointId", ()=>{
    it("Edits endpoint and returns 200", async()=>{
        const {accessToken, userId} = await createAuthenticatedUser();
        const endpoint = await createTestEndpoint(userId) 

        const response = await request(app)
              .patch(`/api/endpoint/editEndpoint/${endpoint.id}`)
              .set("Authorization", `Bearer ${accessToken}`)
              .send({
                 events: ["order.created"]
              });
    
        expect(response.status).toBe(200)
        expect(response.body.updatedEndpoint.events).toEqual(["order.created"])
    
    })

    it("Throws 400 for invlaid input", async ()=>{
        const {accessToken, userId} = await createAuthenticatedUser();
        const endpoint = await createTestEndpoint(userId) 

        const response = await request(app)
              .patch(`/api/endpoint/editEndpoint/${endpoint.id}`)
              .set("Authorization", `Bearer ${accessToken}`)
              .send({
                
              });
        expect(response.status).toBe(400)
    })

    it("Throws 404 for missing endpoint", async() => {
        const {accessToken} = await createAuthenticatedUser(); 

        const response = await request(app)
              .patch(`/api/endpoint/editEndpoint/550e8400-e29b-41d4-a716-446655440000`)
              .set("Authorization", `Bearer ${accessToken}`)
              .send({
                events: ["order.created"]
              });
        expect(response.status).toBe(404)
    })

    it("Throws 404 for unauthorized endpoint", async()=>{
        const user1 = await createAuthenticatedUser();
        const user2 = await createAuthenticatedUser("test2@example.com");
        const endpoint = await createTestEndpoint(user1.userId) 

        const response = await request(app)
              .patch(`/api/endpoint/editEndpoint/${endpoint.id}`)
              .set("Authorization", `Bearer ${user2.accessToken}`)
              .send({
                 events: ["order.created"]
              });
            
        expect(response.status).toBe(404)
        
    })

    it("Returns 409 for duplicate endpoint URL", async () => {
    const user = await createAuthenticatedUser();

    const endpoint1 = await createTestEndpoint(user.userId);

    const endpoint2 = await createEndpoint(
        "https://another-example.com/webhook",
        ["payment.completed"],
        user.userId
    );

    const response = await request(app)
        .patch(`/api/endpoint/editEndpoint/${endpoint2.id}`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({
            url: endpoint1.url
        });

    expect(response.status).toBe(409);
});


})

