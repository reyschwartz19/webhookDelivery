
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

import { signAccessToken, signRefreshToken,saveRefreshToken } from "../../src/modules/token/token.service";
import {loginUser} from "../../src/modules/auth/auth.service"

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
        ).rejects.toThrow("Invalid credentials")
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
        ).rejects.toThrow("Invalid credentials")
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