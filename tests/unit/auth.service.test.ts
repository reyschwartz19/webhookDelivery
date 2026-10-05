
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/prisma", () => ({
    default: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
    },
}));

vi.mock("bcrypt", () =>({
    default: {
        compare: vi.fn(),
        hash: vi.fn(),
    },
}))    //using default because this is originally a default export

vi.mock(
    import("../../src/modules/token/token.service"),
    () => ({
        signAccessToken: vi.fn(),
        signRefreshToken: vi.fn(),
        saveRefreshToken: vi.fn(),
        revokeRefreshToken: vi.fn(),
    })
)

import prisma from "../../src/lib/prisma";
import bcrypt from "bcrypt"

import { signAccessToken, signRefreshToken,saveRefreshToken, revokeRefreshToken } from "../../src/modules/token/token.service";
import {loginUser,registerUser,logoutUser} from "../../src/modules/auth/auth.service"
import { ConflictError, UnauthorizedError } from "../../src/AppError";
import crypto from "crypto"

const mockedCompare = vi.mocked(
  bcrypt.compare as (
    data: string | Buffer,
    encrypted: string
  ) => Promise<boolean>
);

const mockedHash = vi.mocked(
  bcrypt.hash as (
    data: string | Buffer,
    saltOrRounds: string | number
  ) => Promise<string>
);

describe("loginUser",() => {
    beforeEach(()=> {
        vi.clearAllMocks();
    })

    it("throws unauthorizedError when user does not exist", async() => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

        await expect(
            loginUser({
                email: "test@example.com",
                password: "password"
            })
        ).rejects.toThrow(UnauthorizedError)
    })

    it("throws unauthorizedError when password is incorrect", async() => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            userId: "user-1",
            email: "test@example.com",
            hashedPassword: "hashed-password"
        } as any)

        mockedCompare.mockResolvedValue(false)
        await expect(
            loginUser({
                email: "test@example.com",
                password: "wrong-password"
            })
        ).rejects.toThrow(UnauthorizedError)
    })

    it("returns access and refresh tokens for valid credentials", async() => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            userId: "user-1",
            email: "test@example.com",
            hashedPassword: "hashed-password",
        } as any)

        mockedCompare.mockResolvedValue(true)
        vi.mocked(signAccessToken).mockReturnValue("access-token")
        vi.mocked(signRefreshToken).mockReturnValue("refresh-token")
        vi.mocked(saveRefreshToken).mockResolvedValue(undefined)

        const result = await loginUser({
            email: "test@example.com",
            password: "correct-password"
        });

        expect(result).toEqual({
            accessToken: "access-token",
            refreshToken: "refresh-token",
        })

        expect(signAccessToken).toHaveBeenCalledWith("user-1")
        expect(signRefreshToken).toHaveBeenCalledWith("user-1")
        expect(saveRefreshToken).toHaveBeenCalledWith("user-1","refresh-token")
    })
})

describe("registerUser",()=>{
    beforeEach(()=>{
        vi.clearAllMocks();
    })

    it("throws conflictError when existing user is found", async()=>{
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            userId: "user-1",
            email: "test@example.com",
            hashedPassword: "hashed-password"
        } as any)

        await expect(
            registerUser({
                email: "test@example.com",
                password: "user-password"
            })
        ).rejects.toThrow(ConflictError)
    })

    it("Hashes password when new user is created", async() => {
        mockedHash.mockResolvedValue("hashed-password")
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
        
        vi.mocked(prisma.user.create).mockResolvedValue({
            userId: "user-1",
            email: "test@example.come",
            hashedPassword: "hashed-password",
            hashedApiKey: "key-hash"
        }as any)
        
        await registerUser({
            email: "test@example.com",
            password: "password123"
        })
        expect(bcrypt.hash)
           .toHaveBeenCalledWith("password123",10)
        
        expect(prisma.user.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              hashedPassword: "hashed-password"
               })
              })
             );
    } )

    it("Creates new user with hashedApi key", async()=>{
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

        mockedHash.mockResolvedValue("hashed-password")

        vi.mocked(prisma.user.create).mockResolvedValue({
            userId: "user-1",
            email: "test@example.com",
            hashedPassword: "hashed-password"
        }as any)

        const result = await registerUser({
            email: "test@example.com",
            password: "hashed-password"
        })

        const expectedHash = crypto
           .createHash("sha256")
           .update(result.apiKey)
           .digest("hex");

        expect(prisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    hashedApiKey: expectedHash
                })
            })
        )
    })

    it("returns raw APi key to USer", async() => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
          mockedHash.mockResolvedValue("hashed-passoword")

        vi.mocked(prisma.user.create).mockResolvedValue({
            userId: "user-1",
            email: "test@example.com",
            hashedPassword: "hashed-password"
        }as any)

        const result = await registerUser({
            email: "test@example.com",
            password: "hashed-password"
        })

        expect(result.apiKey).toMatch(/^whk_[0-9a-f]{64}$/)
    })

})

describe("logOutUser",()=>{
    it("calls revokeRefreshToken with the user ID and refresh token", async()=>{
       const mockedRevokeRefreshToken = vi.mocked(revokeRefreshToken)
       const refreshToken = "refresh-token"
       
        logoutUser("user-1",refreshToken)
       expect(mockedRevokeRefreshToken)
         .toHaveBeenCalledWith("user-1", refreshToken)
    })
})