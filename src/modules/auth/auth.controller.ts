import { Response, Request } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { registerUser } from "./auth.service";
import { registerSchema } from "../../schema/authInput.schema";

export const registerController = catchAsync(async (req: Request, res: Response) =>{
    const input =  registerSchema.parse(req.body);
    const user = await registerUser(input);

    res.status(201).json({user})
})