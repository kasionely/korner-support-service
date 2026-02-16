import { db } from "../db";

// ==================== TYPES ====================

export type KycStatus =
  | "notStarted"
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "blocked"
  | "revoked";
export type KycFileType = "document" | "selfieWithDocument";
export type KycFileSide = "front" | "back";
export type KycUploadStatus = "pending" | "uploaded" | "confirmed" | "failed";
export type KycDecisionType = "approved" | "rejected" | "revoked";

export interface KycApplication {
  id: number;
  user_id: number;
  status: KycStatus;
  attempt_number: number;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  date_of_birth: Date | null;
  country_of_residence: string | null;
  submitted_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface KycFile {
  id: number;
  kyc_application_id: number;
  file_id: string;
  file_type: KycFileType;
  side: KycFileSide | null;
  mime_type: string;
  size_bytes: number;
  s3_key: string;
  upload_status: KycUploadStatus;
  created_at: Date;
  updated_at: Date;
}

export interface KycDecision {
  id: number;
  kyc_application_id: number;
  admin_user_id: number | null;
  decision: KycDecisionType;
  reason_codes: string[] | null;
  comment: string | null;
  created_at: Date;
}

export interface KycUserSettings {
  user_id: number;
  total_attempts: number;
  max_attempts: number;
  is_blocked: boolean;
  blocked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface KycReasonCode {
  code: string;
  type: string;
  description: string;
  used_for: string[];
}

// ==================== DTOs ====================

export interface CreateKycProfileDTO {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  countryOfResidence?: string;
}

export interface KycFileInitDTO {
  fileType: KycFileType;
  side?: KycFileSide;
  mimeType: string;
  sizeBytes: number;
}

export interface KycFilesAttachDTO {
  documentFront: string; // fileId
  documentBack?: string; // fileId
  selfieWithDocument: string; // fileId
}

export interface KycDecisionDTO {
  decision: "approve" | "reject";
  reasonCodes?: string[];
  comment?: string;
}

export interface KycRevokeDTO {
  reasonCodes: string[];
  comment?: string;
}

// ==================== CONSTANTS ====================

const MAX_ATTEMPTS = 3;
const DRAFT_TTL_HOURS = 24;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ==================== HELPERS ====================

export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateKycId(id: number): string {
  return `kyc_${id}`;
}

export function parseKycId(kycId: string): number | null {
  const match = kycId.match(/^kyc_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

// ==================== USER SETTINGS ====================

export async function getOrCreateUserSettings(userId: number): Promise<KycUserSettings> {
  let settings = await db("kyc_user_settings").where("user_id", userId).first();

  if (!settings) {
    [settings] = await db("kyc_user_settings")
      .insert({
        user_id: userId,
        total_attempts: 0,
        max_attempts: MAX_ATTEMPTS,
        is_blocked: false,
      })
      .returning("*");
  }

  return settings;
}

export async function incrementUserAttempts(userId: number): Promise<KycUserSettings> {
  const settings = await getOrCreateUserSettings(userId);

  const newAttempts = settings.total_attempts + 1;
  const isBlocked = newAttempts >= settings.max_attempts;

  const [updated] = await db("kyc_user_settings")
    .where("user_id", userId)
    .update({
      total_attempts: newAttempts,
      is_blocked: isBlocked,
      blocked_at: isBlocked ? db.fn.now() : null,
      updated_at: db.fn.now(),
    })
    .returning("*");

  return updated;
}

export async function isUserBlocked(userId: number): Promise<boolean> {
  const settings = await getOrCreateUserSettings(userId);
  return settings.is_blocked;
}

// ==================== KYC APPLICATIONS ====================

export async function getActiveKycApplication(userId: number): Promise<KycApplication | null> {
  const application = await db("kyc_applications")
    .where("user_id", userId)
    .orderBy("created_at", "desc")
    .first();

  return application || null;
}

export async function getKycApplicationById(id: number): Promise<KycApplication | null> {
  const application = await db("kyc_applications").where("id", id).first();
  return application || null;
}

export async function getKycApplicationByPublicId(kycId: string): Promise<KycApplication | null> {
  const id = parseKycId(kycId);
  if (!id) return null;
  return getKycApplicationById(id);
}

export async function getKycStatus(userId: number): Promise<{
  status: KycStatus;
  attemptsUsed: number;
  attemptsLeft: number;
  requirements: {
    canWithdraw: boolean;
    canAccessSellerCabinet: boolean;
  };
}> {
  const settings = await getOrCreateUserSettings(userId);
  const application = await getActiveKycApplication(userId);

  let status: KycStatus = "notStarted";
  if (application) {
    if (application.status === "draft" && application.expires_at) {
      const now = new Date();
      if (now > new Date(application.expires_at)) {
        await db("kyc_applications").where("id", application.id).del();
        status = "notStarted";
      } else {
        status = application.status;
      }
    } else {
      status = application.status;
    }
  }

  if (settings.is_blocked) {
    status = "blocked";
  }

  const attemptsUsed = settings.total_attempts;
  const attemptsLeft = Math.max(0, settings.max_attempts - attemptsUsed);

  const canWithdraw = status === "approved";
  const canAccessSellerCabinet = status === "approved";

  return {
    status,
    attemptsUsed,
    attemptsLeft,
    requirements: {
      canWithdraw,
      canAccessSellerCabinet,
    },
  };
}

export async function createOrUpdateKycProfile(
  userId: number,
  data: CreateKycProfileDTO
): Promise<{ kycId: string; status: KycStatus }> {
  const isBlocked = await isUserBlocked(userId);
  if (isBlocked) {
    throw new Error("KYC_BLOCKED");
  }

  let application = await getActiveKycApplication(userId);

  if (application && application.status === "approved") {
    throw new Error("KYC_ALREADY_APPROVED");
  }

  if (application && application.status === "pending") {
    throw new Error("KYC_ALREADY_SUBMITTED");
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + DRAFT_TTL_HOURS);

  const settings = await getOrCreateUserSettings(userId);

  if (!application || application.status === "rejected" || application.status === "revoked") {
    const attemptNumber = settings.total_attempts + 1;

    [application] = await db("kyc_applications")
      .insert({
        user_id: userId,
        status: "draft",
        attempt_number: attemptNumber,
        email: data.email || null,
        phone: data.phone || null,
        first_name: data.firstName || null,
        last_name: data.lastName || null,
        middle_name: data.middleName || null,
        date_of_birth: data.dateOfBirth || null,
        country_of_residence: data.countryOfResidence || null,
        expires_at: expiresAt,
      })
      .returning("*");
  } else {
    [application] = await db("kyc_applications")
      .where("id", application.id)
      .update({
        email: data.email ?? application.email,
        phone: data.phone ?? application.phone,
        first_name: data.firstName ?? application.first_name,
        last_name: data.lastName ?? application.last_name,
        middle_name: data.middleName ?? application.middle_name,
        date_of_birth: data.dateOfBirth ?? application.date_of_birth,
        country_of_residence: data.countryOfResidence ?? application.country_of_residence,
        expires_at: expiresAt,
        updated_at: db.fn.now(),
      })
      .returning("*");
  }

  if (!application) {
    throw new Error("KYC_SERVER_ERROR");
  }

  return {
    kycId: generateKycId(application.id),
    status: application.status,
  };
}

// ==================== KYC FILES ====================

export async function initFileUpload(
  userId: number,
  data: KycFileInitDTO
): Promise<{
  fileId: string;
  s3Key: string;
  maxSizeBytes: number;
}> {
  if (data.sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error("KYC_FILE_SIZE_EXCEEDED");
  }

  if (!ALLOWED_MIME_TYPES.includes(data.mimeType)) {
    throw new Error("KYC_INVALID_FILE_TYPE");
  }

  const application = await getActiveKycApplication(userId);
  if (!application) {
    throw new Error("KYC_APPLICATION_NOT_FOUND");
  }

  if (application.status !== "draft") {
    throw new Error("KYC_INVALID_STATUS");
  }

  const fileId = generateFileId();
  const extension = data.mimeType.split("/")[1] || "jpg";
  const s3Key = `kyc/${userId}/${application.id}/${data.fileType}${data.side ? `_${data.side}` : ""}_${fileId}.${extension}`;

  await db("kyc_files").insert({
    kyc_application_id: application.id,
    file_id: fileId,
    file_type: data.fileType,
    side: data.side || null,
    mime_type: data.mimeType,
    size_bytes: data.sizeBytes,
    s3_key: s3Key,
    upload_status: "pending",
  });

  return {
    fileId,
    s3Key,
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
  };
}

export async function confirmFileUpload(fileId: string): Promise<boolean> {
  const result = await db("kyc_files")
    .where("file_id", fileId)
    .where("upload_status", "pending")
    .update({
      upload_status: "uploaded",
      updated_at: db.fn.now(),
    });

  return result > 0;
}

export async function attachFilesToKyc(userId: number, data: KycFilesAttachDTO): Promise<boolean> {
  const application = await getActiveKycApplication(userId);
  if (!application) {
    throw new Error("KYC_APPLICATION_NOT_FOUND");
  }

  if (application.status !== "draft") {
    throw new Error("KYC_INVALID_STATUS");
  }

  const fileIds = [data.documentFront, data.selfieWithDocument];
  if (data.documentBack) {
    fileIds.push(data.documentBack);
  }

  const files = await db("kyc_files")
    .where("kyc_application_id", application.id)
    .whereIn("file_id", fileIds)
    .where("upload_status", "uploaded");

  if (files.length !== fileIds.length) {
    throw new Error("KYC_FILE_NOT_FOUND");
  }

  await db("kyc_files").whereIn("file_id", fileIds).update({
    upload_status: "confirmed",
    updated_at: db.fn.now(),
  });

  return true;
}

export async function getKycFiles(applicationId: number): Promise<KycFile[]> {
  return db("kyc_files")
    .where("kyc_application_id", applicationId)
    .where("upload_status", "confirmed");
}

// ==================== KYC SUBMIT ====================

export async function submitKyc(userId: number): Promise<{
  id: string;
  status: KycStatus;
  attemptsUsed: number;
  attemptsLeft: number;
}> {
  const isBlocked = await isUserBlocked(userId);
  if (isBlocked) {
    throw new Error("KYC_BLOCKED");
  }

  const application = await getActiveKycApplication(userId);
  if (!application) {
    throw new Error("KYC_APPLICATION_NOT_FOUND");
  }

  if (application.status !== "draft") {
    throw new Error("KYC_INVALID_STATUS");
  }

  if (!application.first_name || !application.last_name || !application.date_of_birth) {
    throw new Error("KYC_VALIDATION_ERROR");
  }

  const files = await getKycFiles(application.id);
  const hasDocumentFront = files.some((f) => f.file_type === "document" && f.side === "front");
  const hasSelfie = files.some((f) => f.file_type === "selfieWithDocument");

  if (!hasDocumentFront || !hasSelfie) {
    throw new Error("KYC_MISSING_REQUIRED_FILES");
  }

  const settings = await incrementUserAttempts(userId);

  const [updated] = await db("kyc_applications")
    .where("id", application.id)
    .update({
      status: "pending",
      submitted_at: db.fn.now(),
      expires_at: null,
      updated_at: db.fn.now(),
    })
    .returning("*");

  return {
    id: generateKycId(updated.id),
    status: updated.status,
    attemptsUsed: settings.total_attempts,
    attemptsLeft: Math.max(0, settings.max_attempts - settings.total_attempts),
  };
}

// ==================== KYC DECISIONS ====================

export async function getLatestDecision(userId: number): Promise<{
  status: KycDecisionType;
  reasonCodes: string[];
  comment: string | null;
} | null> {
  const application = await getActiveKycApplication(userId);
  if (!application) {
    return null;
  }

  const decision = await db("kyc_decisions")
    .where("kyc_application_id", application.id)
    .orderBy("created_at", "desc")
    .first();

  if (!decision) {
    return null;
  }

  return {
    status: decision.decision,
    reasonCodes: decision.reason_codes || [],
    comment: decision.comment,
  };
}

export async function createKycDecision(
  applicationId: number,
  adminUserId: number,
  decision: KycDecisionType,
  reasonCodes?: string[],
  comment?: string
): Promise<KycDecision> {
  if (reasonCodes && reasonCodes.length > 0) {
    const validCodes = await db("kyc_reason_codes").whereIn("code", reasonCodes).select("code");

    if (validCodes.length !== reasonCodes.length) {
      throw new Error("KYC_INVALID_REASON_CODE");
    }
  }

  const newStatus: KycStatus =
    decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "revoked";

  await db("kyc_applications").where("id", applicationId).update({
    status: newStatus,
    updated_at: db.fn.now(),
  });

  const [newDecision] = await db("kyc_decisions")
    .insert({
      kyc_application_id: applicationId,
      admin_user_id: adminUserId,
      decision,
      reason_codes: reasonCodes || null,
      comment: comment || null,
    })
    .returning("*");

  return newDecision;
}

// ==================== ADMIN QUERIES ====================

export async function getKycApplicationsList(params: {
  status: KycStatus;
  limit?: number;
  cursor?: string;
  country?: string;
  attemptNumber?: number;
}): Promise<{
  items: Array<{
    kycId: string;
    userId: string;
    status: KycStatus;
    attemptNumber: number;
    createdAt: string;
    submittedAt: string | null;
    fullName: string;
    dateOfBirth: string | null;
    countryOfResidence: string | null;
  }>;
  pagination: {
    limit: number;
    nextCursor: string | null;
  };
}> {
  const limit = Math.min(params.limit || 20, 100);

  let query = db("kyc_applications")
    .where("status", params.status)
    .orderBy("created_at", "desc")
    .limit(limit + 1);

  if (params.country) {
    query = query.where("country_of_residence", params.country);
  }

  if (params.attemptNumber) {
    query = query.where("attempt_number", params.attemptNumber);
  }

  if (params.cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(params.cursor, "base64").toString("utf-8"));
      query = query.where("id", "<", decoded.id);
    } catch {
      // Invalid cursor, ignore
    }
  }

  const applications = await query;

  const hasMore = applications.length > limit;
  const items = applications.slice(0, limit);

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    nextCursor = Buffer.from(JSON.stringify({ id: lastItem.id })).toString("base64");
  }

  return {
    items: items.map((app: KycApplication) => ({
      kycId: generateKycId(app.id),
      userId: `u_${app.user_id}`,
      status: app.status,
      attemptNumber: app.attempt_number,
      createdAt: app.created_at.toISOString(),
      submittedAt: app.submitted_at ? app.submitted_at.toISOString() : null,
      fullName: [app.last_name, app.first_name, app.middle_name].filter(Boolean).join(" "),
      dateOfBirth: app.date_of_birth ? app.date_of_birth.toISOString().split("T")[0] : null,
      countryOfResidence: app.country_of_residence,
    })),
    pagination: {
      limit,
      nextCursor,
    },
  };
}

export async function getKycApplicationDetails(kycId: string): Promise<{
  kycId: string;
  userId: string;
  status: KycStatus;
  attemptNumber: number;
  createdAt: string;
  submittedAt: string | null;
  profile: {
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    dateOfBirth: string | null;
    countryOfResidence: string | null;
  };
  documents: Record<
    string,
    {
      fileId: string;
      fileType: string;
      side?: string;
      mimeType: string;
      sizeBytes: number;
      viewUrl: string;
    }
  >;
} | null> {
  const application = await getKycApplicationByPublicId(kycId);
  if (!application) {
    return null;
  }

  const files = await db("kyc_files")
    .where("kyc_application_id", application.id)
    .where("upload_status", "confirmed");

  const documents: Record<string, any> = {};

  for (const file of files) {
    let key: string;
    if (file.file_type === "document") {
      key = file.side === "front" ? "documentFront" : "documentBack";
    } else {
      key = "selfieWithDocument";
    }

    // TODO: Generate signed URL for S3
    const viewUrl = `https://storage.signed.url/${file.s3_key}`;

    documents[key] = {
      fileId: file.file_id,
      fileType: file.file_type,
      side: file.side,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      viewUrl,
    };
  }

  return {
    kycId: generateKycId(application.id),
    userId: `u_${application.user_id}`,
    status: application.status,
    attemptNumber: application.attempt_number,
    createdAt: application.created_at.toISOString(),
    submittedAt: application.submitted_at ? application.submitted_at.toISOString() : null,
    profile: {
      email: application.email,
      phone: application.phone,
      firstName: application.first_name,
      lastName: application.last_name,
      middleName: application.middle_name,
      dateOfBirth: application.date_of_birth
        ? application.date_of_birth.toISOString().split("T")[0]
        : null,
      countryOfResidence: application.country_of_residence,
    },
    documents,
  };
}

export async function revokeUserKyc(
  userId: number,
  adminUserId: number,
  reasonCodes: string[],
  comment?: string
): Promise<boolean> {
  const application = await db("kyc_applications")
    .where("user_id", userId)
    .where("status", "approved")
    .orderBy("created_at", "desc")
    .first();

  if (!application) {
    throw new Error("KYC_CANNOT_REVOKE");
  }

  await createKycDecision(application.id, adminUserId, "revoked", reasonCodes, comment);

  return true;
}

export async function getReasonCodes(): Promise<KycReasonCode[]> {
  const codes = await db("kyc_reason_codes").select("*");
  return codes.map((code: any) => ({
    ...code,
    used_for: typeof code.used_for === "string" ? JSON.parse(code.used_for) : code.used_for,
  }));
}

export function parseUserId(userIdStr: string): number | null {
  const match = userIdStr.match(/^u_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
