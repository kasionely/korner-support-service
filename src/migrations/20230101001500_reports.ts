import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("reports");

  if (!hasTable) {
    await knex.schema.createTable("reports", (table) => {
      table.increments("id").primary();
      table.integer("report_type_id").unsigned().notNullable();
      // reporter_user_id is a reference to users in main service (no FK constraint)
      table.integer("reporter_user_id").unsigned().nullable();
      table.string("reporter_email", 255).nullable();
      table.text("comment").nullable();
      table.string("status", 30).notNullable().defaultTo("created");
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

      table.foreign("report_type_id").references("id").inTable("report_types").onDelete("RESTRICT");

      table.check("(\"reporter_user_id\" IS NOT NULL OR \"reporter_email\" IS NOT NULL)");
      table.check("\"status\" IN ('created', 'inReview', 'resolved', 'rejected')");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("reports");
}
