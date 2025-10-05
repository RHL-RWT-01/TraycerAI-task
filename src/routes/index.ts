import { Router } from "express";
import plansRouter from "./plans.routes";

const router = Router();

// Mount sub-router
router.use("/plans", plansRouter);

export default router;

