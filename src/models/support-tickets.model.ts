import { Knex } from "knex";

import { db } from "../db";

export interface SupportTicketType {
  id: number;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketTypeTranslation {
  id: number;
  support_ticket_type_id: number;
  locale: string;
  title: string;
  description?: string;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  support_ticket_type_id: number;
  status: "new" | "inProgress" | "resolved" | "closed";
  requester_user_id?: number;
  requester_name?: string;
  requester_email?: string;
  subject?: string;
  message: string;
  source: string;
  screen?: string;
  url?: string;
  metadata?: any;
  telegram_alert_status: "pending" | "sent" | "failed";
  telegram_alert_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketStatusHistory {
  id: number;
  support_ticket_id: number;
  from_status: string;
  to_status: string;
  changed_by_admin_user_id: number;
  admin_comment?: string;
  created_at: string;
}

export interface SupportTicketTypeWithTranslation {
  id: number;
  code: string;
  title: string;
  description?: string;
  is_active: boolean;
}

export interface CreateSupportTicketParams {
  supportTicketTypeCode: string;
  requesterUserId?: number;
  requesterName?: string;
  requesterEmail?: string;
  subject?: string;
  message: string;
  context: {
    source: string;
    screen?: string;
    url?: string;
    metadata?: any;
  };
}

export interface SupportTicketListFilter {
  type?: string;
  status?: "new" | "inProgress" | "resolved" | "closed";
  dateFrom?: string;
  dateTo?: string;
  requesterUserId?: string;
  page?: number;
  pageSize?: number;
}

export interface SupportTicketListItem {
  ticketId: string;
  type: string;
  status: string;
  createdAt: string;
  requester: {
    userId?: string;
    name?: string;
    email?: string;
  };
  context: {
    source: string;
    screen?: string;
    url?: string;
    metadata?: any;
  };
}

export interface SupportTicketDetails extends SupportTicketListItem {
  updatedAt: string;
  message: string;
  telegramAlert: {
    status: string;
    attempts: number;
  };
}

export const getSupportTicketTypes = async (
  locale: string = "en"
): Promise<SupportTicketTypeWithTranslation[]> => {
  const query = db("support_ticket_types as stt")
    .select("stt.id", "stt.code", "stt.is_active", "sttt.title", "sttt.description")
    .leftJoin("support_ticket_type_translations as sttt", function () {
      this.on("stt.id", "=", "sttt.support_ticket_type_id").andOn(
        "sttt.locale",
        "=",
        db.raw("?", [locale])
      );
    })
    .where("stt.is_active", true)
    .orderBy("stt.id", "asc");

  const result = await query;
  return result.map((row) => ({
    id: row.id,
    code: row.code,
    title: row.title || row.code,
    description: row.description,
    is_active: row.is_active,
  }));
};

export const getSupportTicketTypeByCode = async (
  code: string
): Promise<SupportTicketType | null> => {
  const ticketType = await db("support_ticket_types").where({ code, is_active: true }).first();
  return ticketType || null;
};

export const createSupportTicket = async (
  params: CreateSupportTicketParams,
  trx?: Knex.Transaction
): Promise<SupportTicket> => {
  const query = trx || db;

  const ticketType = await getSupportTicketTypeByCode(params.supportTicketTypeCode);
  if (!ticketType) {
    throw new Error(`Support ticket type not found: ${params.supportTicketTypeCode}`);
  }

  const ticketData = {
    support_ticket_type_id: ticketType.id,
    status: "new" as const,
    requester_user_id: params.requesterUserId || null,
    requester_name: params.requesterName || null,
    requester_email: params.requesterEmail || null,
    subject: params.subject || null,
    message: params.message,
    source: params.context.source,
    screen: params.context.screen || null,
    url: params.context.url || null,
    metadata: params.context.metadata || null,
    telegram_alert_status: "pending" as const,
    telegram_alert_attempts: 0,
  };

  const [createdTicket] = await query("support_tickets").insert(ticketData).returning("*");
  return createdTicket;
};

export const getSupportTicketById = async (ticketId: number): Promise<SupportTicket | null> => {
  const ticket = await db("support_tickets").where({ id: ticketId }).first();
  return ticket || null;
};

export const getSupportTicketsList = async (
  filters: SupportTicketListFilter
): Promise<{ items: SupportTicketListItem[]; total: number }> => {
  const { type, status, dateFrom, dateTo, requesterUserId, page = 1, pageSize = 20 } = filters;

  let query = db("support_tickets as st")
    .select(
      "st.id",
      "st.status",
      "st.created_at",
      "st.requester_user_id",
      "st.requester_name",
      "st.requester_email",
      "st.source",
      "st.screen",
      "stt.code as type_code"
    )
    .leftJoin("support_ticket_types as stt", "st.support_ticket_type_id", "stt.id");

  if (type) {
    query = query.where("stt.code", type);
  }
  if (status) {
    query = query.where("st.status", status);
  }
  if (dateFrom) {
    query = query.where("st.created_at", ">=", dateFrom);
  }
  if (dateTo) {
    query = query.where("st.created_at", "<=", dateTo);
  }
  if (requesterUserId) {
    query = query.where("st.requester_user_id", requesterUserId);
  }

  const countQuery = query.clone().count("* as total");
  const [{ total }] = await countQuery;

  const offset = (page - 1) * pageSize;
  const items = await query.orderBy("st.created_at", "desc").limit(pageSize).offset(offset);

  return {
    items: items.map((item) => ({
      ticketId: `tck_${item.id}`,
      type: item.type_code,
      status: item.status,
      createdAt: item.created_at,
      requester: {
        userId: item.requester_user_id ? `usr_${item.requester_user_id}` : undefined,
        name: item.requester_name,
        email: item.requester_email,
      },
      context: {
        source: item.source,
        screen: item.screen,
      },
    })),
    total: Number(total),
  };
};

export const getSupportTicketDetails = async (
  ticketId: number
): Promise<SupportTicketDetails | null> => {
  const ticket = await db("support_tickets as st")
    .select("st.*", "stt.code as type_code")
    .leftJoin("support_ticket_types as stt", "st.support_ticket_type_id", "stt.id")
    .where("st.id", ticketId)
    .first();

  if (!ticket) return null;

  return {
    ticketId: `tck_${ticket.id}`,
    type: ticket.type_code,
    status: ticket.status,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    message: ticket.message,
    requester: {
      userId: ticket.requester_user_id ? `usr_${ticket.requester_user_id}` : undefined,
      name: ticket.requester_name,
      email: ticket.requester_email,
    },
    context: {
      source: ticket.source,
      screen: ticket.screen,
      url: ticket.url,
      metadata: ticket.metadata,
    },
    telegramAlert: {
      status: ticket.telegram_alert_status,
      attempts: ticket.telegram_alert_attempts,
    },
  };
};

export const updateSupportTicketStatus = async (
  ticketId: number,
  newStatus: "new" | "inProgress" | "resolved" | "closed",
  adminUserId: number,
  adminComment?: string,
  trx?: Knex.Transaction
): Promise<SupportTicket> => {
  const query = trx || db;

  const currentTicket = await getSupportTicketById(ticketId);
  if (!currentTicket) {
    throw new Error(`Support ticket not found: ${ticketId}`);
  }

  const [updatedTicket] = await query("support_tickets")
    .where({ id: ticketId })
    .update({
      status: newStatus,
      updated_at: query.fn.now(),
    })
    .returning("*");

  await query("support_ticket_status_history").insert({
    support_ticket_id: ticketId,
    from_status: currentTicket.status,
    to_status: newStatus,
    changed_by_admin_user_id: adminUserId,
    admin_comment: adminComment || null,
  });

  return updatedTicket;
};
