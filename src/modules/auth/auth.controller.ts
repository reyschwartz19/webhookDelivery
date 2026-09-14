import { Response, Request } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { loginUser, logoutUser, registerUser } from "./auth.service";
import { loginSchema, registerSchema } from "../../schema/authInput.schema";
import { UnauthorizedError } from "../../AppError";
import { rotateRefreshToken } from "../token/token.service";

export const registerController = catchAsync(async (req: Request, res: Response) =>{
    const input =  registerSchema.parse(req.body);
    const user = await registerUser(input);

    res.status(201).json({user})
})

export const loginController = catchAsync(async (req:Request, res:Response) =>{
   const input = loginSchema.parse(req.body)
    const {accessToken, refreshToken} = await loginUser(input)
   res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
   })

   res.json({accessToken})
})

export const logoutController = catchAsync(async(req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken
    if(!req.user){
        throw new UnauthorizedError("Unauthorized")
    }

    if(!refreshController){
        throw new UnauthorizedError("No refresh Token")
    }

    const userId = req.user.userId;
    await logoutUser(userId, refreshToken)
    res.clearCookie("refreshToken",{
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    })
    res.json({message: "LogOut successful"})
})

export const refreshController = catchAsync(async(req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken){
        throw new UnauthorizedError("No refresh Token")
    }

    const {accessToken, refreshToken: newRefreshToken} = await rotateRefreshToken(refreshToken)

    res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
   })

   res.json({accessToken})
})