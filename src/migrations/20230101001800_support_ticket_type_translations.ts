import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("support_ticket_type_translations");

  if (!hasTable) {
    await knex.schema.createTable("support_ticket_type_translations", (table) => {
      table.increments("id").primary();
      table.integer("support_ticket_type_id").notNullable();
      table.string("locale", 5).notNullable();
      table.string("title", 255).notNullable();
      table.string("description", 500).nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

      table
        .foreign("support_ticket_type_id")
        .references("id")
        .inTable("support_ticket_types")
        .onDelete("CASCADE");
      table.unique(["support_ticket_type_id", "locale"]);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("support_ticket_type_translations");
}
