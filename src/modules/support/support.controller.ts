import { Request, Response } from "express";

import { SupportError, supportService } from "./support.service";
import { ERROR_CODES } from "../../utils/errorCodes";

function handleError(error: unknown, res: Response, logPrefix: string) {
  if (error instanceof SupportError) {
    return res.status(error.statusCode).json({ code: error.code, message: error.message });
  }
  if (error && typeof error === "object" && "validationError" in error) {
    return res.status(400).json((error as any).validationError);
  }
  console.error(`${logPrefix}:`, error);
  return res.status(500).json({ code: ERROR_CODES.SUPPORT_SERVER_ERROR, message: "Internal server error" });
}

export async function getTicketTypes(req: Request, res: Response) {
  try {
    const locale = (req.query.locale as string) || "en";
    const result = await supportService.getTicketTypes(locale);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(error, res, "Error retrieving support ticket types");
  }
}

export async function createTicket(req: Request, res: Response) {
  try {
    const result = await supportService.createTicket(req.auth?.userId, req.body);
    return res.status(201).json(result);
  } catch (error) {
    return handleError(error, res, "Error creating support ticket");
  }
}

export async function getAdminTickets(req: Request, res: Response) {
  try {
    const result = await supportService.getAdminTickets(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(error, res, "Error retrieving support tickets list");
  }
}

export async function getAdminTicketDetails(req: Request, res: Response) {
  try {
    const result = await supportService.getAdminTicketDetails(req.params.ticketId);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(error, res, "Error retrieving support ticket details");
  }
}

export async function updateTicketStatus(req: Request, res: Response) {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({
        code: ERROR_CODES.SUPPORT_UNAUTHORIZED,
        message: "Authentication required",
      });
    }
    const result = await supportService.updateTicketStatus(req.params.ticketId, userId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(error, res, "Error updating support ticket status");
  }
}
