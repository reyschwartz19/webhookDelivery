import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../AppError.js";
import { verifyAccessToken } from "../modules/token/token.service.js";


export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"]
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return next(new UnauthorizedError("No token provided"))
    }
    const token = authHeader.split(" ")[1];

    try{
        const payload = verifyAccessToken(token)
        req.user = payload
        next()
    } catch(error){
        if(error instanceof jwt.TokenExpiredError){
            return next(new UnauthorizedError("Token Expired"))
        }

        return next(new UnauthorizedError("Invalid token"))
    }
}