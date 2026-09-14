import prisma from "../../lib/prisma";
import bcrypt from "bcrypt"
import { LoginInput, RegisterInput } from "../../types/auth.types";
import { ConflictError, UnauthorizedError } from "../../AppError";
import crypto from "crypto"
import { saveRefreshToken, signAccessToken, signRefreshToken, revokeRefreshToken } from "../token/token.service";

const SALT_ROUNDS = 10;

const createApiKey = () => {
    return `whk_${crypto.randomBytes(32).toString("hex")}`
}

const hashApiKey = (apiKey: string) => {
    return crypto
        .createHash("sha256")
        .update(apiKey)
        .digest("hex")
}

export const registerUser = async (input: RegisterInput) => {
    const {email, password} = input;

    const existingUser = await prisma.user.findUnique({
        where: {email}
    });

    if (existingUser){
        throw new ConflictError("Email already in use")
    }
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const apiKey = createApiKey()
    const hashedApiKey = hashApiKey(apiKey)
    const newUser = await prisma.user.create({
        data: {
            email,
            hashedPassword,
            hashedApiKey
        }
    });
    return {
        id: newUser.userId,
        email: newUser.email,
        apiKey
    }
}

export const loginUser = async (input: LoginInput) => {
    const {email,password} = input

    const user = await prisma.user.findUnique({
        where: {email: input.email}
    })
    if(!user){
        throw new UnauthorizedError("Invalid credentials")
    }
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword)
    if(!passwordMatch){
        throw new UnauthorizedError("Invalid credentials")
    }

    const accessToken = signAccessToken(user.userId)
    const refreshToken = signRefreshToken(user.userId)
    await saveRefreshToken(user.userId, refreshToken)

    return {
        accessToken,
        refreshToken
    }
}

export const logoutUser = async (UserId: string, refreshToken: string) => {
   await revokeRefreshToken(UserId, refreshToken);
}