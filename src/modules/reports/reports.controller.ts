import { Request, Response } from "express";

import { ReportsError, reportsService } from "./reports.service";
import { ERROR_CODES } from "../../utils/errorCodes";

function handleError(error: unknown, res: Response, logPrefix: string) {
  if (error instanceof ReportsError) {
    return res.status(error.statusCode).json({ code: error.code, message: error.message });
  }
  if (error && typeof error === "object" && "validationError" in error) {
    return res.status(400).json((error as any).validationError);
  }
  console.error(`${logPrefix}:`, error);
  return res.status(500).json({ code: ERROR_CODES.REPORTS_SERVER_ERROR, message: "Failed to process request" });
}

export async function getReportTypes(req: Request, res: Response) {
  try {
    const locale = (req.query.locale as string) || "en";
    const result = await reportsService.getReportTypes(locale);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(error, res, "Error retrieving report types");
  }
}

export async function createReport(req: Request, res: Response) {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({
        code: ERROR_CODES.REPORTS_UNAUTHORIZED,
        message: "Authentication required",
      });
    }
    const result = await reportsService.createReport(userId, req.body);
    return res.status(201).json(result);
  } catch (error) {
    return handleError(error, res, "Error creating report");
  }
}
