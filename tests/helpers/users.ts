import { randomUUID } from "crypto";
import prisma from "../../src/lib/prisma.js";
import request from "supertest"
import app from "../../src/app.js";
import { createApiKey, hashApiKey } from "../../src/modules/auth/auth.service.js";

export const createTestUser = async () => {
    const id = randomUUID();
    const apiKey = createApiKey();
    const hashedApiKey = hashApiKey(apiKey)


    const user = await prisma.user.create({
        data: {
            email: `test-${id}@example.com`,
            hashedPassword: "test-password-hash",
            hashedApiKey
        }
    });

    return{
        ...user,
        apiKey
    }
};

export const createAuthenticatedUser = async (
    email = "test@example.com"
) => {
    const password = "password123";
  

    const registration = await request(app)
        .post("/api/auth/register")
        .send({ email, password })
        .expect(201);

    const response = await request(app)
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

    return {
        accessToken: response.body.accessToken,
        userId: registration.body.user.id
    };
};