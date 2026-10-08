import { beforeEach, describe, expect, it } from "vitest";
import prisma from "../../src/lib/prisma";
import { registerUser } from "../../src/modules/auth/auth.service";
import crypto from "crypto"


beforeEach(async()=>{
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
})

describe("register user intergration", ()=>{
    it("creates a user in the database", async () =>{
        await registerUser({
            email: "test@example.com",
            password: "password123"
        })

        const user = await prisma.user.findUnique({
            where: {
                email: "test@example.com"
            }
        })
        expect(user).not.toBeNull();
        expect(user?.email).toBe("test@example.com")
    })

    it("stores hashed API key in the db", async ()=>{
        const result = await registerUser({
            email: "test@example.com",
            password: "password123"
        })
       
        const user = await prisma.user.findUnique({
            where: {
                email: "test@example.com"
            }
        })

        const expectedHash = crypto
           .createHash("sha256")
           .update(result.apiKey)
           .digest("hex");
        
        expect(user).not.toBeNull()
        expect(user?.hashedApiKey).toBe(expectedHash)
        expect(user?.hashedApiKey).not.toBe(result.apiKey)

    })
})