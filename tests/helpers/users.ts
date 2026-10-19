import { randomUUID } from "crypto";
import prisma from "../../src/lib/prisma.js";

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