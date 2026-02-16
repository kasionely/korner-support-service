import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("support_tickets");

  if (!hasTable) {
    await knex.schema.createTable("support_tickets", (table) => {
      table.increments("id").primary();
      table.integer("support_ticket_type_id").notNullable();
      table.string("status", 30).notNullable().defaultTo("new");
      // requester_user_id is a reference to users in main service (no FK constraint)
      table.integer("requester_user_id").nullable();
      table.string("requester_name", 255).nullable();
      table.string("requester_email", 255).nullable();
      table.string("subject", 255).nullable();
      table.text("message").notNullable();
      table.string("source", 50).notNullable();
      table.string("screen", 100).nullable();
      table.string("url", 500).nullable();
      table.jsonb("metadata").nullable();
      table.string("telegram_alert_status", 30).notNullable().defaultTo("pending");
      table.integer("telegram_alert_attempts").notNullable().defaultTo(0);
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

      table
        .foreign("support_ticket_type_id")
        .references("id")
        .inTable("support_ticket_types")
        .onDelete("CASCADE");

      table.index(["status"]);
      table.index(["requester_user_id"]);
      table.index(["created_at"]);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("support_tickets");
}
