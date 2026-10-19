import { beforeEach, describe, expect, it } from "vitest";
import prisma from "../../src/lib/prisma";
import { registerUser,loginUser,logoutUser } from "../../src/modules/auth/auth.service";
import crypto from "crypto"
import bcrypt from "bcrypt"
import { cleanDatabase } from "../helpers/database";

beforeEach(async()=>{
    await cleanDatabase();
})

describe("register user intergration", ()=>{
    it("registers a user and securely persists their credentials", async () =>{
        const result = await registerUser({
            email: "test@example.com",
            password: "password123"
        })

        const user = await prisma.user.findUnique({
            where: {
                email: "test@example.com"
            }
        })

         expect(user).not.toBeNull();

        const passwordMatches = await bcrypt.compare(
            "password123",
            user!.hashedPassword
        );

        const expectedHash = crypto
           .createHash("sha256")
           .update(result.apiKey)
           .digest("hex");

       
        expect(user?.email).toBe("test@example.com")
        expect(passwordMatches).toBe(true)
        expect(user?.hashedApiKey).toBe(expectedHash)
        expect(user?.hashedApiKey).not.toBe(result.apiKey)
    })

})

describe("login user intergration", ()=>{
    it("logs in a user and persists the refresh session", async()=>{
        await registerUser({
            email: "test@example.com",
            password: "password123"
        })

        const result = await loginUser({
            email: "test@example.com",
            password: "password123"
        })

        const user = await prisma.user.findUnique({
            where: {
                email: "test@example.com"
            }
        })
        expect(user).not.toBeNull()

        expect(result.accessToken).toBeDefined()
        expect(result.refreshToken).toBeDefined()
        
        const session = await prisma.session.findFirst({
            where: {
                userId: user!.userId
            }
        })

        const expectedHash = crypto
           .createHash("sha256")
           .update(result.refreshToken)
           .digest("hex");


        expect(session).not.toBeNull();
       
        expect(expectedHash).toBe(session!.tokenHash)

    })
})

describe("log out user intergration", ()=>{
    it("removes the user's refresh session from the database", async()=>{
        await registerUser({
            email: "test@example.com",
            password: "password123"
        })

        const result = await loginUser({
            email: "test@example.com",
            password: "password123"
        })

        const user = await prisma.user.findUnique({
            where: {
                email: "test@example.com"
            }
        })
        expect(user).not.toBeNull()

        const session = await prisma.session.findFirst({
            where: {
                userId: user!.userId
            }
        })
        expect(session).not.toBeNull();

        await logoutUser(user!.userId, result.refreshToken)
         const sessionAfter = await prisma.session.findFirst({
            where: {
                userId: user!.userId
            }
        })
        expect(sessionAfter).toBeNull();
    })
})