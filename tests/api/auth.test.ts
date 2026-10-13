import {beforeEach, describe, expect, it} from 'vitest';
import request from "supertest"
import app from "../../src/app.js"
import prisma from "../../src/lib/prisma.js"



beforeEach(async() => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
});

const registerTestUser = async () => {
  return request(app)
    .post("/api/auth/register")
    .send({
      email: "test@example.com",
      password: "password123"
    });
};


describe("POST api/auth/register",()=>{
    it("registers a user and returns 201", async ()=>{
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                email: "test@example.com",
                password: "password123"
            });

            expect(response.status).toBe(201);

            expect(response.body.user.email).toBe("test@example.com")
            expect(response.body.user.id).toBeDefined()
            expect(response.body.user.apiKey).toBeDefined()
            
    })

    it("returns 409 when email is already registered", async ()=>{
        const payload = {
            email: "test@example.com",
            password: "password123"
        }

        await request(app)
            .post("/api/auth/register")
            .send(payload);

        const response = await request(app)
              .post("/api/auth/register")
              .send(payload);
        
        expect(response.status).toBe(409);

        expect(response.body).toEqual({
            message: "Email already in use"
        })
    })


    it("returns 400 when password is missing ", async ()=>{
         
        const payload = {
            email: "test@example.com",
            password: ""
        }
        
        const response = await request(app)
            .post("/api/auth/register")
            .send(payload);
        
        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation error")
    })
    
    it("returns 400 when email is invalid", async()=>{
           const payload = {
            email: "test.com",
            password: "password123"
        }
        
        const response = await request(app)
            .post("/api/auth/register")
            .send(payload);
        
        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation error")
    })


})

describe("POST /api/auth/login", ()=>{
    it("logs in a user and returns 200", async ()=>{
        await registerTestUser();

        const response = await request(app)
              .post("/api/auth/login")
              .send({
                email: "test@example.com",
                password: "password123"
              });
        
        expect(response.status).toBe(200);

        expect(response.body.accessToken).toBeDefined();
        const cookies = response.headers["set-cookie"];
        expect(cookies).toBeDefined();
        const cookieList = Array.isArray(cookies)
          ? cookies
          : [cookies];
        expect(
            cookieList.some(cookie => 
                cookie.startsWith("refreshToken=")
            )
        ).toBe(true)
        
    })

    it("returns 401 when login credentials are wrong", async ()=>{
        await registerTestUser();
       
        const response = await request(app)
              .post("/api/auth/login")
              .send({
                email: "test@example.com",
                password: "password1234"
              });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid credentials"
        })
    })

    it("returns 400 when password is missing",async ()=> {
        
         const response = await request(app)
              .post("/api/auth/login")
              .send({
                email: "test@example.com",
                password: ""
              });
        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation error")
    })

    it("returns 400 when email is invalid",async ()=> {
        
        
         const response = await request(app)
              .post("/api/auth/login")
              .send({
                email: "test@.com",
                password: "password123"
              });
        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation error")
    })
})