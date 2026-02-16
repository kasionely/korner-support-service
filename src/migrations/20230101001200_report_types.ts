import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("report_types");

  if (!hasTable) {
    await knex.schema.createTable("report_types", (table) => {
      table.increments("id").primary();
      table.string("code", 50).notNullable().unique();
      table.boolean("is_comment_required").notNullable();
      table.boolean("is_active").notNullable().defaultTo(true);
      table.integer("sort_order").notNullable().defaultTo(0);
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("report_types");
}
