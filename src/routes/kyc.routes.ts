import { Router } from "express";

import { kycController } from "../controllers/kyc.controller";
import { authMiddleware } from "../middleware/authMiddleware";
import { errorHandler } from "../middleware/kycErrorHandler.middleware";
import { validate } from "../middleware/validation.middleware";
import * as validators from "../validators/kyc.validator";

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/v1/kyc/status
 */
router.get("/status", kycController.getStatus.bind(kycController));

/**
 * PUT /api/v1/kyc/profile
 */
router.put(
  "/profile",
  validate(validators.updateKycProfileSchema),
  kycController.updateProfile.bind(kycController)
);

/**
 * POST /api/v1/kyc/files/init
 */
router.post(
  "/files/init",
  validate(validators.initFileUploadSchema),
  kycController.initFileUpload.bind(kycController)
);

/**
 * POST /api/v1/kyc/files/confirm
 */
router.post(
  "/files/confirm",
  validate(validators.confirmFileUploadSchema),
  kycController.confirmFileUpload.bind(kycController)
);

/**
 * PUT /api/v1/kyc/files
 */
router.put(
  "/files",
  validate(validators.attachFilesSchema),
  kycController.attachFiles.bind(kycController)
);

/**
 * POST /api/v1/kyc/submit
 */
router.post("/submit", kycController.submit.bind(kycController));

/**
 * GET /api/v1/kyc/decisions/latest
 */
router.get("/decisions/latest", kycController.getLatestDecision.bind(kycController));

router.use(errorHandler);

export default router;
