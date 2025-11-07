import express from "express";
import cors from "cors";
import "dotenv/config"
import tokenRouter from "./routes/token.route.js";

const port = process.env.PORT || 8080;

const app = express();

app.use(express.json());
app.use(cors())

app.use("/api/token", tokenRouter);

app.listen(port, () => {
    console.log(`----- Backend Running on port ${port} -----`);
})