import { Knex } from "knex";

import { db } from "../db";

export interface ReportType {
  id: number;
  code: string;
  is_comment_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ReportTypeTranslation {
  id: number;
  report_type_id: number;
  locale: string;
  title: string;
  description?: string;
  created_at: string;
}

export interface Report {
  id: number;
  report_type_id: number;
  reporter_user_id?: number;
  reporter_email?: string;
  comment?: string;
  status: "created" | "inReview" | "resolved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface ReportContext {
  id: number;
  report_id: number;
  source: "bar_menu" | "page";
  screen?: string;
  content_type: "bar" | "comment";
  content_id: string;
  creator_user_id?: number;
  url?: string;
  metadata?: any;
  created_at: string;
}

export interface ReportTypeWithTranslation {
  id: number;
  code: string;
  title: string;
  description?: string;
  is_comment_required: boolean;
  sort_order: number;
}

export interface CreateReportParams {
  reportTypeCode: string;
  reporterUserId?: number;
  reporterEmail?: string;
  comment?: string | null;
  context: {
    source: "bar_menu" | "page";
    screen: string | null;
    contentType: "bar" | "comment";
    contentId: string;
    creatorUserId: string | null;
    url: string | null;
    metadata?: any;
  };
}

export const getReportTypes = async (
  locale: string = "en"
): Promise<ReportTypeWithTranslation[]> => {
  const query = db("report_types as rt")
    .select(
      "rt.id",
      "rt.code",
      "rt.is_comment_required",
      "rt.sort_order",
      "rtt.title",
      "rtt.description"
    )
    .leftJoin("report_type_translations as rtt", function () {
      this.on("rt.id", "=", "rtt.report_type_id").andOn("rtt.locale", "=", db.raw("?", [locale]));
    })
    .where("rt.is_active", true)
    .orderBy("rt.sort_order", "asc");

  const result = await query;
  return result.map((row) => ({
    id: row.id,
    code: row.code,
    title: row.title || row.code,
    description: row.description,
    is_comment_required: row.is_comment_required,
    sort_order: row.sort_order,
  }));
};

export const getReportTypeByCode = async (code: string): Promise<ReportType | null> => {
  const reportType = await db("report_types").where({ code, is_active: true }).first();
  return reportType || null;
};

export const createReport = async (
  params: CreateReportParams,
  trx?: Knex.Transaction
): Promise<Report> => {
  const query = trx || db;

  const reportType = await getReportTypeByCode(params.reportTypeCode);
  if (!reportType) {
    throw new Error(`Report type not found: ${params.reportTypeCode}`);
  }

  const reportData = {
    report_type_id: reportType.id,
    reporter_user_id: params.reporterUserId || null,
    reporter_email: params.reporterEmail || null,
    comment: params.comment || null,
    status: "created" as const,
  };

  const [createdReport] = await query("reports").insert(reportData).returning("*");
  return createdReport;
};

export const createReportContext = async (
  reportId: number,
  contextData: CreateReportParams["context"],
  trx?: Knex.Transaction
): Promise<ReportContext> => {
  const query = trx || db;

  const context = {
    report_id: reportId,
    source: contextData.source,
    screen: contextData.screen ?? null,
    content_type: contextData.contentType,
    content_id: contextData.contentId,
    creator_user_id: contextData.creatorUserId ? parseInt(contextData.creatorUserId) : null,
    url: contextData.url ?? null,
    metadata: contextData.metadata ?? null,
  };

  const [createdContext] = await query("report_context").insert(context).returning("*");
  return createdContext;
};

export const getReportById = async (reportId: number): Promise<Report | null> => {
  const report = await db("reports").where({ id: reportId }).first();
  return report || null;
};
