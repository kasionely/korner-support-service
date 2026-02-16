import { db } from "../../db";
import {
  getSupportTicketTypes,
  createSupportTicket,
  getSupportTicketsList,
  getSupportTicketDetails,
  updateSupportTicketStatus,
  CreateSupportTicketParams,
} from "../../models/support-tickets.model";
import {
  createSupportTicketSchema,
  updateTicketStatusSchema,
  supportTicketListQuerySchema,
  localeSchema,
  ticketIdSchema,
} from "./support.validation";
import { cacheValues } from "../../utils/cache";
import { toCamelCaseDeep } from "../../utils/camelCase";
import { ERROR_CODES } from "../../utils/errorCodes";
import redis from "../../utils/redis";

export class SupportError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

class SupportService {
  async getTicketTypes(locale: string) {
    const localeValidation = localeSchema.safeParse(locale);
    if (!localeValidation.success) {
      throw new SupportError(ERROR_CODES.SUPPORT_INVALID_LOCALE, "Invalid locale format", 400);
    }

    const cacheKey = `support_ticket_types:${locale}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`Served support ticket types from Redis cache: ${cacheKey}`);
      return toCamelCaseDeep(JSON.parse(cached));
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
      meta: { locale, fallback_locale: "en" },
    };

    await redis.setex(cacheKey, cacheValues.month, JSON.stringify(response));
    console.log(`Cached support ticket types: ${cacheKey}`);

    return toCamelCaseDeep(response);
  }

  async createTicket(userId: number | undefined, body: unknown) {
    const validationResult = createSupportTicketSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      throw {
        validationError: {
          code: ERROR_CODES.SUPPORT_VALIDATION_ERROR,
          message: "Invalid request",
          fields: errors,
        },
      };
    }

    const { supportTicketTypeCode, requesterName, requesterEmail, subject, message, context } =
      validationResult.data;

    if (supportTicketTypeCode === "payout" && !userId) {
      throw new SupportError(
        ERROR_CODES.SUPPORT_UNAUTHORIZED,
        "Authorization required for payout issues",
        401
      );
    }

    if (!userId) {
      const missingFields = [];
      if (!requesterName) {
        missingFields.push({ field: "requesterName", message: "Name is required for guest requests" });
      }
      if (!requesterEmail) {
        missingFields.push({ field: "requesterEmail", message: "Email is required for guest requests" });
      }
      if (missingFields.length > 0) {
        throw {
          validationError: {
            code: ERROR_CODES.SUPPORT_GUEST_FIELDS_REQUIRED,
            message: "Name and email are required for guest requests",
            fields: missingFields,
          },
        };
      }
    }

    try {
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
        return createSupportTicket(ticketParams, trx);
      });

      return toCamelCaseDeep({
        ticket_id: `tck_${result.id}`,
        status: result.status,
        created_at: result.created_at,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Support ticket type not found")) {
        throw new SupportError(
          ERROR_CODES.SUPPORT_INVALID_TICKET_TYPE,
          "Invalid support ticket type code",
          400
        );
      }
      throw error;
    }
  }

  async getAdminTickets(query: unknown) {
    const queryValidation = supportTicketListQuerySchema.safeParse(query);
    if (!queryValidation.success) {
      const errors = queryValidation.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      throw {
        validationError: {
          code: ERROR_CODES.SUPPORT_VALIDATION_ERROR,
          message: "Invalid query parameters",
          fields: errors,
        },
      };
    }

    const filters = queryValidation.data;
    const { items, total } = await getSupportTicketsList(filters);
    return toCamelCaseDeep({ items, page: filters.page, page_size: filters.pageSize, total });
  }

  async getAdminTicketDetails(ticketIdParam: string) {
    const ticketIdValidation = ticketIdSchema.safeParse(ticketIdParam);
    if (!ticketIdValidation.success) {
      throw new SupportError(ERROR_CODES.SUPPORT_INVALID_TICKET_ID, "Invalid ticket ID format", 400);
    }

    const ticketId = parseInt(ticketIdParam.replace("tck_", ""));
    const ticketDetails = await getSupportTicketDetails(ticketId);

    if (!ticketDetails) {
      throw new SupportError(ERROR_CODES.SUPPORT_TICKET_NOT_FOUND, "Support ticket not found", 404);
    }

    return toCamelCaseDeep(ticketDetails);
  }

  async updateTicketStatus(ticketIdParam: string, userId: number, body: unknown) {
    const ticketIdValidation = ticketIdSchema.safeParse(ticketIdParam);
    if (!ticketIdValidation.success) {
      throw new SupportError(ERROR_CODES.SUPPORT_INVALID_TICKET_ID, "Invalid ticket ID format", 400);
    }

    const validationResult = updateTicketStatusSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      throw {
        validationError: {
          code: ERROR_CODES.SUPPORT_VALIDATION_ERROR,
          message: "Invalid request",
          fields: errors,
        },
      };
    }

    const { status, adminComment } = validationResult.data;
    const ticketId = parseInt(ticketIdParam.replace("tck_", ""));

    try {
      const updatedTicket = await updateSupportTicketStatus(ticketId, status, userId, adminComment);
      return toCamelCaseDeep({
        ticket_id: `tck_${updatedTicket.id}`,
        status: updatedTicket.status,
        updated_at: updatedTicket.updated_at,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Support ticket not found")) {
          throw new SupportError(ERROR_CODES.SUPPORT_TICKET_NOT_FOUND, "Support ticket not found", 404);
        }
        if (error.message.includes("Invalid status transition")) {
          throw new SupportError(
            ERROR_CODES.SUPPORT_INVALID_STATUS,
            "Allowed: new, inProgress, resolved, closed",
            400
          );
        }
      }
      throw error;
    }
  }
}

export const supportService = new SupportService();
