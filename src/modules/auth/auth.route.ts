import { registerController } from "./auth.controller";
import { Router } from "express";

const authRouter = Router();

authRouter.post("/register", registerController)

export default authRouter;