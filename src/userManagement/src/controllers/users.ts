import { Router } from "express";
import { registerUser } from "../services/users.ts";

const router = Router();

router.post("/register", async (req, res) => {

  const user = await registerUser(req.body);

  res.json({
    success: true,
    message: "User Registered Successfully",
    data: user,
  });
});

export default router;