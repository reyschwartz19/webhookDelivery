import prisma from "../../lib/prisma";
import bcrypt from "bcrypt"
import { RegisterInput } from "../../types/auth.types";
import { ConflictError } from "../../AppError";
import crypto from "crypto"

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