import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("report_type_translations");

  if (!hasTable) {
    await knex.schema.createTable("report_type_translations", (table) => {
      table.increments("id").primary();
      table.integer("report_type_id").unsigned().notNullable();
      table.string("locale", 5).notNullable();
      table.string("title", 255).notNullable();
      table.string("description", 500).nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

      table.foreign("report_type_id").references("id").inTable("report_types").onDelete("CASCADE");
      table.unique(["report_type_id", "locale"]);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("report_type_translations");
}
