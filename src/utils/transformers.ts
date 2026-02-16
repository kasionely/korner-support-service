import { ReportTypeWithTranslation } from "../models/reports.model";

export const transformReportTypeToApi = (reportType: ReportTypeWithTranslation) => ({
  id: reportType.id,
  code: reportType.code,
  title: reportType.title,
  description: reportType.description,
  isCommentRequired: reportType.is_comment_required,
  sortOrder: reportType.sort_order,
});

export const transformReportTypesToApi = (reportTypes: ReportTypeWithTranslation[]) =>
  reportTypes.map(transformReportTypeToApi);
