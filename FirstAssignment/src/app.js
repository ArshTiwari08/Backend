import express from "express";
import userRouter from "./routes/user.routes.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "User API is running"
    });
});

app.use("/api/v1/users", userRouter);

export default app;