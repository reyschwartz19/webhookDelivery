import { randomUUID } from "crypto";
import prisma from "../../src/lib/prisma.js";
import request from "supertest"
import app from "../../src/app.js";

export const createTestUser = async () => {
    const id = randomUUID();

    return prisma.user.create({
        data: {
            email: `test-${id}@example.com`,
            hashedPassword: "test-password-hash",
            hashedApiKey: `test-api-key-hash-${id}`
        }
    });
};

export const createAuthenticatedUser = async () => {
    const email = "test@example.com";
    const password = "password123";

    await request(app)
        .post("/api/auth/register")
        .send({ email, password })
        .expect(201);

    const response = await request(app)
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

    return {
        accessToken: response.body.accessToken
    };
};