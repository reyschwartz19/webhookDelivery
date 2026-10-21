import express from "express";
import cors from "cors"
import authRouter from "./modules/auth/auth.route.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import cookieParser from "cookie-parser"
import endpointRouter from "./modules/endpoint/endpoint.route.js";


const app = express();

app.use(cors(
    {
        origin: ["http://localhost:3000"],
        methods: ["GET","POST","PUT","DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    }
))

app.use(express.json());
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())

app.use("/api/auth", authRouter)
app.use("/api/endpoint", endpointRouter)

app.get("/", (req, res) => {
  res.json({ message: "Hello from my-app" });
});

app.use(errorHandler);

export default app;