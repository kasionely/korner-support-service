import { Router, Request, Response } from "express";

import { db } from "../db";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getReportTypes,
  createReport,
  createReportContext,
  CreateReportParams,
} from "../models/reports.model";
import { createReportSchema, localeSchema } from "../schemas/reports.schema";
import { cacheValues } from "../utils/cache";
import { ERROR_CODES } from "../utils/errorCodes";
import redis from "../utils/redis";
import { transformReportTypesToApi } from "../utils/transformers";

const router = Router();

router.get("/types", async (req: Request, res: Response) => {
  try {
    const locale = (req.query.locale as string) || "en";

    const localeValidation = localeSchema.safeParse(locale);
    if (!localeValidation.success) {
      return res.status(400).json({
        code: ERROR_CODES.REPORTS_INVALID_LOCALE,
        message: "Invalid locale format",
      });
    }

    const cacheKey = `report_types:${locale}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`Served report types from Redis cache: ${cacheKey}`);
      return res.status(200).json(JSON.parse(cached));
    }

    const reportTypes = await getReportTypes(locale);
    const response = {
      items: transformReportTypesToApi(reportTypes),
    };

    await redis.setex(cacheKey, cacheValues.month, JSON.stringify(response));
    console.log(`Cached report types: ${cacheKey}`);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error retrieving report types:", error);
    return res.status(500).json({
      code: ERROR_CODES.REPORTS_SERVER_ERROR,
      message: "Failed to retrieve report types",
    });
  }
});

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({
        code: ERROR_CODES.REPORTS_UNAUTHORIZED,
        message: "Authentication required",
      });
    }

    const validationResult = createReportSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return res.status(400).json({
        code: ERROR_CODES.REPORTS_VALIDATION_ERROR,
        message: "Invalid request",
        fields: errors,
      });
    }

    const { reportTypeCode, comment, context } = validationResult.data;

    const result = await db.transaction(async (trx) => {
      const reportParams: CreateReportParams = {
        reportTypeCode,
        reporterUserId: userId,
        comment,
        context,
      };

      const report = await createReport(reportParams, trx);
      await createReportContext(report.id, context, trx);

      return report;
    });

    return res.status(201).json({
      reportId: result.id.toString(),
      status: result.status,
      createdAt: result.created_at,
    });
  } catch (error) {
    console.error("Error creating report:", error);

    if (error instanceof Error && error.message.includes("Report type not found")) {
      return res.status(400).json({
        code: ERROR_CODES.REPORTS_INVALID_REPORT_TYPE,
        message: "Invalid report type code",
      });
    }

    return res.status(500).json({
      code: ERROR_CODES.REPORTS_SERVER_ERROR,
      message: "Failed to create report",
    });
  }
});

export default router;
