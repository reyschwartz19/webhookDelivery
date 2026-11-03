import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../AppError.js";
import { hashApiKey } from "../modules/auth/auth.service.js";
import prisma from "../lib/prisma.js";

export const authenticateKey = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const apiKey = req.get("x-api-key")
    if(!apiKey){
        throw new UnauthorizedError("API key is required")
    }
    const hashedApiKey = hashApiKey(apiKey)
    const user = await prisma.user.findUnique({
        where: {
            hashedApiKey
        },
        select: {
            userId: true
        }
    })
    if(!user){
        throw new UnauthorizedError("Invalid API key")
    }
    req.user = {
        userId: user.userId
    }
    next()
}