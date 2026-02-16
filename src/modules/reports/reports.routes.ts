import { Router } from "express";

import * as reportsController from "./reports.controller";
import { authMiddleware } from "../../middleware/authMiddleware";

const router = Router();

router.get("/types", reportsController.getReportTypes);
router.post("/", authMiddleware, reportsController.createReport);

export default router;
