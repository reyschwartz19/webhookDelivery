import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";
import { UnauthorizedError } from "../../AppError.js";
import crypto from "node:crypto"



const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

const ACCESS_TOKEN_EXP = "15m";
const REFRESH_TOKEN_EXP = "7d";

  const hashToken = (token: string) => {
        return crypto
                 .createHash("sha256")
                 .update(token)
                 .digest("hex")
    }

export const signAccessToken = (userId : string) => {
    return jwt.sign({userId}, ACCESS_SECRET, {expiresIn: ACCESS_TOKEN_EXP})
}

export const verifyAccessToken = (token: string) => {
    try {
        return jwt.verify(token, ACCESS_SECRET) as {userId: string}
    } catch {
        throw new UnauthorizedError("Invalid access token")
    }
}

export const signRefreshToken = (userId: string) => {
    return jwt.sign({userId}, REFRESH_SECRET, {expiresIn: REFRESH_TOKEN_EXP})
}

export const saveRefreshToken = async (userId: string, token: string) => {
  
    const tokenHash =  hashToken(token);
    const expiresAt =new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) //7 days

    await prisma.session.create({
        data: {userId, tokenHash, expiresAt}
    })
}

export const rotateRefreshToken = async (oldToken: string) => {
    const oldTokenHash = hashToken(oldToken);

    let payload: { userId: string };

    try {
        payload = jwt.verify(oldToken, REFRESH_SECRET) as { userId: string };
    } catch {
        throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const matchedSession = await prisma.session.findUnique({
        where: {
            tokenHash: oldTokenHash
        }
    });

    if (!matchedSession) {
        throw new UnauthorizedError("Refresh token not found");
    }

    if (matchedSession.userId !== payload.userId) {
        throw new UnauthorizedError("Invalid refresh token");
    }

    if (matchedSession.expiresAt <= new Date()) {
        throw new UnauthorizedError("Refresh token expired");
    }

    const newAccessToken = signAccessToken(payload.userId);
    const newRefreshToken = signRefreshToken(payload.userId);

    await prisma.$transaction(async (tx) => {
        // Atomically consume the old session
        const result = await tx.session.deleteMany({
            where: {
                sessionId: matchedSession.sessionId,
                tokenHash: oldTokenHash,
                expiresAt: {
                    gt: new Date()
                }
            }
        });

        if (result.count !== 1) {
            throw new UnauthorizedError(
                "Refresh token already used or expired"
            );
        }

        // Create the replacement session
        await tx.session.create({
            data: {
                userId: payload.userId,
                tokenHash: hashToken(newRefreshToken),
                expiresAt: new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000
                )
            }
        });
    });

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };
};

export const revokeRefreshToken = async (userId: string, token: string) => {
     const tokenHash =  hashToken(token);

    
        await prisma.session.deleteMany({
            where: {
                userId,
                tokenHash
            }
        })
    
    
   

  
}