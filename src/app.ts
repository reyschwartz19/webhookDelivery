import express from "express";
import cors from "cors"
import authRouter from "./modules/auth/auth.route";


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

app.use("/api/auth", authRouter)

app.get("/", (req, res) => {
  res.json({ message: "Hello from my-app" });
});

export default app;