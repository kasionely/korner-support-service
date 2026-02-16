import { Request, Response, NextFunction } from "express";

import { kycService } from "./kyc.service";
import { ERROR_CODES } from "../../utils/errorCodes";

export class KycController {
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({
          error: { code: ERROR_CODES.KYC_UNAUTHORIZED, message: "Authorization required" },
        });
      }
      const status = await kycService.getKycStatus(userId);
      return res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({
          error: { code: ERROR_CODES.KYC_UNAUTHORIZED, message: "Authorization required" },
        });
      }
      const result = await kycService.createOrUpdateProfile(userId, req.body);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async initFileUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({
          error: { code: ERROR_CODES.KYC_UNAUTHORIZED, message: "Authorization required" },
        });
      }
      const result = await kycService.initFileUpload(userId, req.body);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async confirmFileUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({
          error: { code: ERROR_CODES.KYC_UNAUTHORIZED, message: "Authorization required" },
        });
      }
      const result = await kycService.confirmFileUpload(req.body.fileId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async attachFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({
          error: { code: ERROR_CODES.KYC_UNAUTHORIZED, message: "Authorization required" },
        });
      }
      const result = await kycService.attachFiles(userId, req.body);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({
          error: { code: ERROR_CODES.KYC_UNAUTHORIZED, message: "Authorization required" },
        });
      }
      const result = await kycService.submitKyc(userId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getLatestDecision(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({
          error: { code: ERROR_CODES.KYC_UNAUTHORIZED, message: "Authorization required" },
        });
      }
      const decision = await kycService.getLatestDecision(userId);
      return res.status(200).json(decision);
    } catch (error) {
      next(error);
    }
  }
}

export const kycController = new KycController();
