import { z } from "zod";

export const createReportSchema = z
  .object({
    reportTypeCode: z.string().min(1, "Report type code is required"),
    comment: z
      .string()
      .min(10, "Comment must be at least 10 characters")
      .max(500, "Comment must be at most 500 characters")
      .nullable()
      .optional(),
    context: z.object({
      source: z.union([z.literal("bar_menu"), z.literal("page")]),
      screen: z.string().nullable(),
      contentType: z.union([z.literal("bar"), z.literal("comment")]),
      contentId: z.string(),
      creatorUserId: z.string().nullable(),
      url: z.string().nullable(),
      metadata: z.any().nullable(),
    }),
  })
  .refine(
    (data) => {
      const requiresComment =
        data.reportTypeCode === "technicalIssue" || data.reportTypeCode === "other";
      return !requiresComment || (data.comment && data.comment.trim().length > 0);
    },
    {
      message: "Comment is required for technical issues and other report types",
      path: ["comment"],
    }
  );

export const localeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid locale format");
