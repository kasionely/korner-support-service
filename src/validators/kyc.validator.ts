import { z } from "zod";

export const updateKycProfileSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format").optional(),
    phone: z
      .string()
      .regex(/^\+\d{10,15}$/, "Invalid phone format. Expected: +77771234567")
      .optional(),
    firstName: z.string().min(1, "First name is required").max(100).optional(),
    lastName: z.string().min(1, "Last name is required").max(100).optional(),
    middleName: z.string().max(100).optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected: YYYY-MM-DD")
      .optional(),
    countryOfResidence: z
      .string()
      .regex(/^[A-Z]{2}$/, "Invalid country code. Expected ISO 3166-1 alpha-2 (e.g., KZ, RU)")
      .optional(),
  }),
});

export const initFileUploadSchema = z.object({
  body: z.object({
    fileType: z.enum(["document", "selfieWithDocument"], {
      errorMap: () => ({ message: "Invalid fileType. Expected: document or selfieWithDocument" }),
    }),
    side: z
      .enum(["front", "back"], {
        errorMap: () => ({ message: "Invalid side. Expected: front or back" }),
      })
      .optional(),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"], {
      errorMap: () => ({
        message: "Invalid file type. Allowed: image/jpeg, image/png, image/webp",
      }),
    }),
    sizeBytes: z.number().positive("File size must be a positive number"),
  }),
});

export const confirmFileUploadSchema = z.object({
  body: z.object({
    fileId: z.string().min(1, "fileId is required"),
  }),
});

export const attachFilesSchema = z.object({
  body: z.object({
    documentFront: z.string().min(1, "documentFront is required"),
    documentBack: z.string().optional(),
    selfieWithDocument: z.string().min(1, "selfieWithDocument is required"),
  }),
});
