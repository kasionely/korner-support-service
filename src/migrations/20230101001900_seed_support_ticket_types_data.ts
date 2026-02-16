import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const ticketTypes = [
    { id: 1, code: "general", is_active: true },
    { id: 2, code: "payoutIssue", is_active: true },
  ];

  await knex("support_ticket_types").insert(ticketTypes).onConflict("code").ignore();

  const translations = [
    {
      support_ticket_type_id: 1,
      locale: "en",
      title: "Support",
      description: "Ask a question or report a problem",
    },
    {
      support_ticket_type_id: 1,
      locale: "ru",
      title: "Поддержка",
      description: "Задайте вопрос или сообщите о проблеме",
    },
    {
      support_ticket_type_id: 2,
      locale: "en",
      title: "Payout Help",
      description: "Issues with withdrawing funds",
    },
    {
      support_ticket_type_id: 2,
      locale: "ru",
      title: "Помощь с выплатами",
      description: "Проблемы с выводом средств",
    },
  ];

  await knex("support_ticket_type_translations")
    .insert(translations)
    .onConflict(["support_ticket_type_id", "locale"])
    .ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex("support_ticket_type_translations").del();
  await knex("support_ticket_types").del();
}
