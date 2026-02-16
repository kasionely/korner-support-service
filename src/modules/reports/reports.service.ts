import { db } from "../../db";
import {
  getReportTypes,
  createReport,
  createReportContext,
  CreateReportParams,
} from "../../models/reports.model";
import { createReportSchema, localeSchema } from "./reports.validation";
import { cacheValues } from "../../utils/cache";
import { ERROR_CODES } from "../../utils/errorCodes";
import redis from "../../utils/redis";
import { transformReportTypesToApi } from "../../utils/transformers";

export class ReportsError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

class ReportsService {
  async getReportTypes(locale: string) {
    const localeValidation = localeSchema.safeParse(locale);
    if (!localeValidation.success) {
      throw new ReportsError(ERROR_CODES.REPORTS_INVALID_LOCALE, "Invalid locale format", 400);
    }

    const cacheKey = `report_types:${locale}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`Served report types from Redis cache: ${cacheKey}`);
      return JSON.parse(cached);
    }

    const reportTypes = await getReportTypes(locale);
    const response = { items: transformReportTypesToApi(reportTypes) };

    await redis.setex(cacheKey, cacheValues.month, JSON.stringify(response));
    console.log(`Cached report types: ${cacheKey}`);

    return response;
  }

  async createReport(userId: number, body: unknown) {
    const validationResult = createReportSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      throw {
        validationError: {
          code: ERROR_CODES.REPORTS_VALIDATION_ERROR,
          message: "Invalid request",
          fields: errors,
        },
      };
    }

    const { reportTypeCode, comment, context } = validationResult.data;

    try {
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

      return {
        reportId: result.id.toString(),
        status: result.status,
        createdAt: result.created_at,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Report type not found")) {
        throw new ReportsError(ERROR_CODES.REPORTS_INVALID_REPORT_TYPE, "Invalid report type code", 400);
      }
      throw error;
    }
  }
}

export const reportsService = new ReportsService();
