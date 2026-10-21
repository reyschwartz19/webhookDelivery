import {beforeEach, describe, expect, it} from 'vitest';
import request from "supertest"
import app from "../../src/app.js"
import { cleanDatabase } from '../helpers/database.js';
import { createAuthenticatedUser } from '../helpers/users.js';


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

