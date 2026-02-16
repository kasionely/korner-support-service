export interface PayoutRequest {
  id: number;
  status: "created" | "inReview" | "processing" | "paid" | "rejected" | "canceled";
  requester_user_id: number;
  requester_name: string;
  requester_email: string;
  phone: string;
  preferred_contact_method: "email" | "phoneCall" | "whatsApp" | "telegram";
  source: string;
  screen?: string;
  url?: string;
  metadata?: any;
  telegram_alert_status: "pending" | "sent" | "failed";
  telegram_alert_attempts: number;
  created_at: string;
  updated_at: string;
}
