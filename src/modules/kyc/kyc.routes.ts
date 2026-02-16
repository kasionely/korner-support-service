import { Router } from "express";

import { kycController } from "./kyc.controller";
import { authMiddleware } from "../../middleware/authMiddleware";
import { errorHandler } from "../../middleware/kycErrorHandler.middleware";
import { validate } from "../../middleware/validation.middleware";
import * as validators from "./kyc.validation";

const router = Router();

router.use(authMiddleware);

router.get("/status", kycController.getStatus.bind(kycController));
router.put("/profile", validate(validators.updateKycProfileSchema), kycController.updateProfile.bind(kycController));
router.post("/files/init", validate(validators.initFileUploadSchema), kycController.initFileUpload.bind(kycController));
router.post("/files/confirm", validate(validators.confirmFileUploadSchema), kycController.confirmFileUpload.bind(kycController));
router.put("/files", validate(validators.attachFilesSchema), kycController.attachFiles.bind(kycController));
router.post("/submit", kycController.submit.bind(kycController));
router.get("/decisions/latest", kycController.getLatestDecision.bind(kycController));

router.use(errorHandler);

export default router;
