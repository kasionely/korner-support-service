import { Router, Request, Response } from "express";

import { db } from "../db";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/authMiddleware";
import {
  getSupportTicketTypes,
  createSupportTicket,
  getSupportTicketsList,
  getSupportTicketDetails,
  updateSupportTicketStatus,
  CreateSupportTicketParams,
} from "../models/support-tickets.model";
import {
  createSupportTicketSchema,
  updateTicketStatusSchema,
  supportTicketListQuerySchema,
  localeSchema,
  ticketIdSchema,
} from "../schemas/support-tickets.schema";
import { cacheValues } from "../utils/cache";
import { toCamelCaseDeep } from "../utils/camelCase";
import { ERROR_CODES } from "../utils/errorCodes";
import redis from "../utils/redis";

const router = Router();

// GET /api/v1/support/ticket-types
router.get("/ticket-types", async (req: Request, res: Response) => {
  try {
    const locale = (req.query.locale as string) || "en";

    const localeValidation = localeSchema.safeParse(locale);
    if (!localeValidation.success) {
      return res.status(400).json({
        code: ERROR_CODES.SUPPORT_INVALID_LOCALE,
        message: "Invalid locale format",
      });
    }

    const cacheKey = `support_ticket_types:${locale}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`Served support ticket types from Redis cache: ${cacheKey}`);
      return res.status(200).json(toCamelCaseDeep(JSON.parse(cached)));
    }

    const ticketTypes = await getSupportTicketTypes(locale);
    const response = {
      items: ticketTypes.map((type) => ({
        id: type.id.toString(),
        code: type.code,
        title: type.title,
        description: type.description,
        is_active: type.is_active,
        sort_order: type.id,
        visibility: {
          allowed_for_guest: type.code === "general",
          allowed_for_authorized: true,
        },
      })),
      meta: {
        locale,
        fallback_locale: "en",
      },
    };

    await redis.setex(cacheKey, cacheValues.month, JSON.stringify(response));
    console.log(`Cached support ticket types: ${cacheKey}`);

    return res.status(200).json(toCamelCaseDeep(response));
  } catch (error) {
    console.error("Error retrieving support ticket types:", error);
    return res.status(500).json({
      code: ERROR_CODES.SUPPORT_SERVER_ERROR,
      message: "Failed to retrieve support ticket types",
    });
  }
});

// POST /api/v1/support/tickets
router.post("/tickets", optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const validationResult = createSupportTicketSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return res.status(400).json({
        code: ERROR_CODES.SUPPORT_VALIDATION_ERROR,
        message: "Invalid request",
        fields: errors,
      });
    }

    const { supportTicketTypeCode, requesterName, requesterEmail, subject, message, context } =
      validationResult.data;
    const userId = req.auth?.userId;

    if (supportTicketTypeCode === "payout" && !userId) {
      return res.status(401).json({
        code: ERROR_CODES.SUPPORT_UNAUTHORIZED,
        message: "Authorization required for payout issues",
      });
    }

    if (!userId) {
      const missingFields = [];
      if (!requesterName) {
        missingFields.push({
          field: "requesterName",
          message: "Name is required for guest requests",
        });
      }
      if (!requesterEmail) {
        missingFields.push({
          field: "requesterEmail",
          message: "Email is required for guest requests",
        });
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          code: ERROR_CODES.SUPPORT_GUEST_FIELDS_REQUIRED,
          message: "Name and email are required for guest requests",
          fields: missingFields,
        });
      }
    }

    const result = await db.transaction(async (trx) => {
      const ticketParams: CreateSupportTicketParams = {
        supportTicketTypeCode,
        requesterUserId: userId,
        requesterName,
        requesterEmail,
        subject,
        message,
        context: {
          source: context.source,
          screen: context.screen || undefined,
          url: context.url || undefined,
          metadata: context.metadata || undefined,
        },
      };

      const ticket = await createSupportTicket(ticketParams, trx);

      return ticket;
    });

    return res.status(201).json(
      toCamelCaseDeep({
        ticket_id: `tck_${result.id}`,
        status: result.status,
        created_at: result.created_at,
      })
    );
  } catch (error) {
    console.error("Error creating support ticket:", error);

    if (error instanceof Error && error.message.includes("Support ticket type not found")) {
      return res.status(400).json({
        code: ERROR_CODES.SUPPORT_INVALID_TICKET_TYPE,
        message: "Invalid support ticket type code",
      });
    }

    return res.status(500).json({
      code: ERROR_CODES.SUPPORT_SERVER_ERROR,
      message: "Failed to create support ticket",
    });
  }
});

// GET /api/v1/support/admin/tickets
router.get("/admin/tickets", authMiddleware, async (req: Request, res: Response) => {
  try {
    const queryValidation = supportTicketListQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      const errors = queryValidation.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return res.status(400).json({
        code: ERROR_CODES.SUPPORT_VALIDATION_ERROR,
        message: "Invalid query parameters",
        fields: errors,
      });
    }

    const filters = queryValidation.data;
    const { items, total } = await getSupportTicketsList(filters);

    return res.status(200).json(
      toCamelCaseDeep({
        items,
        page: filters.page,
        page_size: filters.pageSize,
        total,
      })
    );
  } catch (error) {
    console.error("Error retrieving support tickets list:", error);
    return res.status(500).json({
      code: ERROR_CODES.SUPPORT_SERVER_ERROR,
      message: "Failed to retrieve support tickets",
    });
  }
});

// GET /api/v1/support/admin/tickets/:ticketId
router.get("/admin/tickets/:ticketId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const ticketIdValidation = ticketIdSchema.safeParse(req.params.ticketId);
    if (!ticketIdValidation.success) {
      return res.status(400).json({
        code: ERROR_CODES.SUPPORT_INVALID_TICKET_ID,
        message: "Invalid ticket ID format",
      });
    }

    const ticketId = parseInt(req.params.ticketId.replace("tck_", ""));
    const ticketDetails = await getSupportTicketDetails(ticketId);

    if (!ticketDetails) {
      return res.status(404).json({
        code: ERROR_CODES.SUPPORT_TICKET_NOT_FOUND,
        message: "Support ticket not found",
      });
    }

    return res.status(200).json(toCamelCaseDeep(ticketDetails));
  } catch (error) {
    console.error("Error retrieving support ticket details:", error);
    return res.status(500).json({
      code: ERROR_CODES.SUPPORT_SERVER_ERROR,
      message: "Failed to retrieve support ticket details",
    });
  }
});

// PATCH /api/v1/support/admin/tickets/:ticketId/status
router.patch(
  "/admin/tickets/:ticketId/status",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({
          code: ERROR_CODES.SUPPORT_UNAUTHORIZED,
          message: "Authentication required",
        });
      }

      const ticketIdValidation = ticketIdSchema.safeParse(req.params.ticketId);
      if (!ticketIdValidation.success) {
        return res.status(400).json({
          code: ERROR_CODES.SUPPORT_INVALID_TICKET_ID,
          message: "Invalid ticket ID format",
        });
      }

      const validationResult = updateTicketStatusSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return res.status(400).json({
          code: ERROR_CODES.SUPPORT_VALIDATION_ERROR,
          message: "Invalid request",
          fields: errors,
        });
      }

      const { status, adminComment } = validationResult.data;
      const ticketId = parseInt(req.params.ticketId.replace("tck_", ""));

      const updatedTicket = await updateSupportTicketStatus(ticketId, status, userId, adminComment);

      return res.status(200).json(
        toCamelCaseDeep({
          ticket_id: `tck_${updatedTicket.id}`,
          status: updatedTicket.status,
          updated_at: updatedTicket.updated_at,
        })
      );
    } catch (error) {
      console.error("Error updating support ticket status:", error);

      if (error instanceof Error) {
        if (error.message.includes("Support ticket not found")) {
          return res.status(404).json({
            code: ERROR_CODES.SUPPORT_TICKET_NOT_FOUND,
            message: "Support ticket not found",
          });
        }

        if (error.message.includes("Invalid status transition")) {
          return res.status(400).json({
            code: ERROR_CODES.SUPPORT_INVALID_STATUS,
            message: "Allowed: new, inProgress, resolved, closed",
          });
        }
      }

      return res.status(500).json({
        code: ERROR_CODES.SUPPORT_SERVER_ERROR,
        message: "Failed to update support ticket status",
      });
    }
  }
);

export default router;
