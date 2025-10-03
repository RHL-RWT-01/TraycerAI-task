import { Router } from "express";
import analysisRouter from "./analysis.routes";
import plansRouter from "./plans.routes";

const router = Router();

// Mount sub-routers
router.use("/plans", plansRouter);
router.use("/analysis", analysisRouter);


export default router;
