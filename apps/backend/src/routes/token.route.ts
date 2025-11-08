import { Router } from "express";
import { generateToken } from "../methods/generateToken.js";

const router: Router = Router();

router.post("/", async (req, res) => {
    try {
        const { username: participantName, room } = req.body;

        console.log("participantName", participantName);
        console.log("room", room);

        if (!participantName || !room) {
            res.status(400).json({ msg: "please send userName and room" });
            return;
        }

        const token = await generateToken({ participantName, room });

        console.log("token", token);

        res.json({ token });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "could not generate token" })
    }
})

export default router;