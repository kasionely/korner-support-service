import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("support_ticket_status_history");

  if (!hasTable) {
    await knex.schema.createTable("support_ticket_status_history", (table) => {
      table.increments("id").primary();
      table.integer("support_ticket_id").notNullable();
      table.string("from_status", 30).notNullable();
      table.string("to_status", 30).notNullable();
      // changed_by_admin_user_id is a reference to users in main service (no FK constraint)
      table.integer("changed_by_admin_user_id").notNullable();
      table.string("admin_comment", 500).nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

      table
        .foreign("support_ticket_id")
        .references("id")
        .inTable("support_tickets")
        .onDelete("CASCADE");

      table.index(["support_ticket_id"]);
      table.index(["created_at"]);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("support_ticket_status_history");
}
