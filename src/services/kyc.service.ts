import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";

import * as kycModel from "../models/kyc.model";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

/**
 * KYC Service - содержит всю бизнес-логику для KYC
 */
export class KycService {
  private getKycBucketName(): string {
    return process.env.ACTIVE_ENV === "prod" ? "korner-pro-private" : "korner-lol-private";
  }

  async getKycStatus(userId: number) {
    return kycModel.getKycStatus(userId);
  }

  async createOrUpdateProfile(userId: number, data: kycModel.CreateKycProfileDTO) {
    return kycModel.createOrUpdateKycProfile(userId, data);
  }

  async initFileUpload(userId: number, data: kycModel.KycFileInitDTO) {
    const result = await kycModel.initFileUpload(userId, data);

    const command = new PutObjectCommand({
      Bucket: this.getKycBucketName(),
      Key: result.s3Key,
      ContentType: data.mimeType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
      fileId: result.fileId,
      uploadUrl,
      maxSizeBytes: result.maxSizeBytes,
    };
  }

  async confirmFileUpload(fileId: string) {
    const success = await kycModel.confirmFileUpload(fileId);

    if (!success) {
      throw new Error("KYC_FILE_NOT_FOUND");
    }

    return { success: true, message: "File upload confirmed" };
  }

  async attachFiles(userId: number, data: kycModel.KycFilesAttachDTO) {
    await kycModel.attachFilesToKyc(userId, data);
    return { success: true, message: "Files attached to KYC application" };
  }

  async submitKyc(userId: number) {
    const result = await kycModel.submitKyc(userId);

    return {
      message: "KYC submitted",
      kyc: {
        id: result.id,
        status: result.status,
        attemptsUsed: result.attemptsUsed,
        attemptsLeft: result.attemptsLeft,
      },
    };
  }

  async getLatestDecision(userId: number) {
    const decision = await kycModel.getLatestDecision(userId);

    if (!decision) {
      throw new Error("KYC_APPLICATION_NOT_FOUND");
    }

    return decision;
  }
}

export const kycService = new KycService();
