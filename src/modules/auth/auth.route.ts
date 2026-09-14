import { loginController, logoutController, refreshController, registerController } from "./auth.controller";
import { Router } from "express";

const authRouter = Router();

authRouter.post("/register", registerController)
authRouter.post("/login", loginController)
authRouter.post("/refresh", refreshController)
authRouter.post("/logout", logoutController)

export default authRouter;