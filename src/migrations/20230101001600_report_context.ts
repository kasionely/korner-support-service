import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("report_context");

  if (!hasTable) {
    await knex.schema.createTable("report_context", (table) => {
      table.increments("id").primary();
      table.integer("report_id").unsigned().notNullable();
      table.string("source", 50).notNullable();
      table.string("screen", 100).nullable();
      table.string("content_type", 50).notNullable();
      table.string("content_id", 100).notNullable();
      // creator_user_id is a reference to users in main service (no FK constraint)
      table.integer("creator_user_id").unsigned().nullable();
      table.string("url", 500).nullable();
      table.jsonb("metadata").nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

      table.foreign("report_id").references("id").inTable("reports").onDelete("CASCADE");

      table.check("\"source\" IN ('bar_menu', 'page')");
      table.check("\"content_type\" IN ('bar', 'comment')");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("report_context");
}
