import { Request, Response, NextFunction } from "express";

import { ERROR_CODES } from "../utils/errorCodes";

/**
 * Централизованный error handler middleware для KYC routes
 */
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", error);

  const errorMessage = error.message;

  if (errorMessage === "KYC_BLOCKED") {
    return res.status(423).json({
      error: {
        code: ERROR_CODES.KYC_BLOCKED,
        message: "Maximum number of KYC attempts exceeded",
      },
    });
  }

  if (errorMessage === "KYC_ALREADY_APPROVED") {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.KYC_ALREADY_APPROVED,
        message: "KYC is already approved",
      },
    });
  }

  if (errorMessage === "KYC_ALREADY_SUBMITTED") {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.KYC_ALREADY_SUBMITTED,
        message: "KYC is already submitted for review",
      },
    });
  }

  if (errorMessage === "KYC_FILE_SIZE_EXCEEDED") {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.KYC_FILE_SIZE_EXCEEDED,
        message: "File size exceeds maximum allowed (5MB)",
      },
    });
  }

  if (errorMessage === "KYC_INVALID_FILE_TYPE") {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.KYC_INVALID_FILE_TYPE,
        message: "Invalid file type. Allowed: image/jpeg, image/png, image/webp",
      },
    });
  }

  if (errorMessage === "KYC_APPLICATION_NOT_FOUND") {
    return res.status(404).json({
      error: {
        code: ERROR_CODES.KYC_APPLICATION_NOT_FOUND,
        message: "KYC application not found",
      },
    });
  }

  if (errorMessage === "KYC_INVALID_STATUS") {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.KYC_INVALID_STATUS,
        message: "Cannot perform this action in current KYC status",
      },
    });
  }

  if (errorMessage === "KYC_VALIDATION_ERROR") {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.KYC_VALIDATION_ERROR,
        message: "Please fill in all required fields",
      },
    });
  }

  if (errorMessage === "KYC_MISSING_REQUIRED_FILES") {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.KYC_MISSING_REQUIRED_FILES,
        message: "Please upload document (front) and selfie with document",
      },
    });
  }

  if (errorMessage === "KYC_FILE_NOT_FOUND") {
    return res.status(404).json({
      error: {
        code: ERROR_CODES.KYC_FILE_NOT_FOUND,
        message: "File not found or not uploaded",
      },
    });
  }

  return res.status(500).json({
    error: {
      code: ERROR_CODES.KYC_SERVER_ERROR,
      message: process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
    },
  });
};
