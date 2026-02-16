import { z } from "zod";

export const createSupportTicketSchema = z.object({
  supportTicketTypeCode: z.enum(["general", "technical", "billing", "account", "payout"], {
    errorMap: () => ({ message: "Invalid support ticket type code" }),
  }),
  requesterName: z
    .string()
    .min(1, "Requester name is required")
    .max(255, "Requester name must be at most 255 characters")
    .optional(),
  requesterEmail: z
    .string()
    .email("Invalid email format")
    .max(255, "Email must be at most 255 characters")
    .optional(),
  subject: z.string().max(255, "Subject must be at most 255 characters").optional(),
  message: z
    .string()
    .min(1, "Message is required")
    .max(2000, "Message must be at most 2000 characters"),
  context: z.object({
    source: z.string().min(1, "Source is required"),
    screen: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    metadata: z
      .object({
        device: z.string(),
        appVersion: z.string(),
      })
      .nullable()
      .optional(),
  }),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(["new", "inProgress", "resolved", "closed"]),
  adminComment: z.string().max(500, "Admin comment must be at most 500 characters").optional(),
});

export const supportTicketListQuerySchema = z.object({
  type: z.string().optional(),
  status: z.enum(["new", "inProgress", "resolved", "closed"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  requesterUserId: z.string().optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("1"),
  pageSize: z
    .string()
    .transform((val) => Math.min(parseInt(val, 10), 100))
    .default("20"),
});

export const localeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid locale format");

export const ticketIdSchema = z.string().regex(/^tck_\d+$/, "Invalid ticket ID format");
