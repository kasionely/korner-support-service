import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // KYC applications table
  const hasKycApplications = await knex.schema.hasTable("kyc_applications");
  if (!hasKycApplications) {
    await knex.schema.createTable("kyc_applications", (table) => {
      table.increments("id").primary();
      // user_id is a reference to users in main service (no FK constraint)
      table.integer("user_id").notNullable();
      table
        .enum("status", [
          "notStarted",
          "draft",
          "pending",
          "approved",
          "rejected",
          "blocked",
          "revoked",
        ])
        .notNullable()
        .defaultTo("draft");
      table.integer("attempt_number").notNullable().defaultTo(1);
      table.string("email", 255).nullable();
      table.string("phone", 50).nullable();
      table.string("first_name", 100).nullable();
      table.string("last_name", 100).nullable();
      table.string("middle_name", 100).nullable();
      table.date("date_of_birth").nullable();
      table.string("country_of_residence", 2).nullable();
      table.timestamp("submitted_at").nullable();
      table.timestamp("expires_at").nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

      table.index(["user_id"]);
      table.index(["status"]);
      table.index(["created_at"]);
      table.index(["submitted_at"]);
    });
  }

  // KYC files table
  const hasKycFiles = await knex.schema.hasTable("kyc_files");
  if (!hasKycFiles) {
    await knex.schema.createTable("kyc_files", (table) => {
      table.increments("id").primary();
      table
        .integer("kyc_application_id")
        .notNullable()
        .references("id")
        .inTable("kyc_applications")
        .onDelete("CASCADE");
      table.string("file_id", 100).notNullable().unique();
      table.enum("file_type", ["document", "selfieWithDocument"]).notNullable();
      table.enum("side", ["front", "back"]).nullable();
      table.string("mime_type", 100).notNullable();
      table.integer("size_bytes").notNullable();
      table.string("s3_key", 500).notNullable();
      table
        .enum("upload_status", ["pending", "uploaded", "confirmed", "failed"])
        .notNullable()
        .defaultTo("pending");
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

      table.index(["kyc_application_id"]);
      table.index(["file_id"]);
      table.index(["upload_status"]);
    });
  }

  // KYC reason codes table
  const hasKycReasonCodes = await knex.schema.hasTable("kyc_reason_codes");
  if (!hasKycReasonCodes) {
    await knex.schema.createTable("kyc_reason_codes", (table) => {
      table.string("code", 50).primary();
      table
        .enum("type", ["document", "photo", "identity", "legal", "admin", "risk", "system"])
        .notNullable();
      table.string("description", 255).notNullable();
      table
        .jsonb("used_for")
        .notNullable()
        .defaultTo(JSON.stringify(["reject"]));
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    });

    await knex("kyc_reason_codes").insert([
      { code: "invalidDocument", type: "document", description: "Документ недействителен или просрочен", used_for: JSON.stringify(["reject"]) },
      { code: "poorPhotoQuality", type: "photo", description: "Фото нечитабельное / размытое", used_for: JSON.stringify(["reject"]) },
      { code: "documentMismatch", type: "document", description: "Данные документа не совпадают с введёнными", used_for: JSON.stringify(["reject"]) },
      { code: "wrongPerson", type: "identity", description: "На селфи не тот человек", used_for: JSON.stringify(["reject"]) },
      { code: "missingDocumentSide", type: "document", description: "Отсутствует одна из сторон документа", used_for: JSON.stringify(["reject"]) },
      { code: "underage", type: "legal", description: "Пользователь не достиг допустимого возраста", used_for: JSON.stringify(["reject"]) },
      { code: "unsupportedCountry", type: "legal", description: "Страна не поддерживается", used_for: JSON.stringify(["reject"]) },
      { code: "manualRevoke", type: "admin", description: "Ручной отзыв администратором", used_for: JSON.stringify(["revoke"]) },
      { code: "fraudSuspicion", type: "risk", description: "Подозрение на мошенничество", used_for: JSON.stringify(["reject", "revoke"]) },
      { code: "policyViolation", type: "legal", description: "Нарушение правил сервиса", used_for: JSON.stringify(["revoke"]) },
      { code: "technicalError", type: "system", description: "Техническая ошибка проверки", used_for: JSON.stringify(["reject"]) },
    ]);
  }

  // KYC decisions table
  const hasKycDecisions = await knex.schema.hasTable("kyc_decisions");
  if (!hasKycDecisions) {
    await knex.schema.createTable("kyc_decisions", (table) => {
      table.increments("id").primary();
      table
        .integer("kyc_application_id")
        .notNullable()
        .references("id")
        .inTable("kyc_applications")
        .onDelete("CASCADE");
      // admin_user_id is a reference to users in main service (no FK constraint)
      table.integer("admin_user_id").nullable();
      table.enum("decision", ["approved", "rejected", "revoked"]).notNullable();
      table.specificType("reason_codes", "text[]").nullable();
      table.text("comment").nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

      table.index(["kyc_application_id"]);
      table.index(["created_at"]);
    });
  }

  // KYC user settings table
  const hasKycUserSettings = await knex.schema.hasTable("kyc_user_settings");
  if (!hasKycUserSettings) {
    await knex.schema.createTable("kyc_user_settings", (table) => {
      // user_id is a reference to users in main service (no FK constraint)
      table.integer("user_id").primary();
      table.integer("total_attempts").notNullable().defaultTo(0);
      table.integer("max_attempts").notNullable().defaultTo(3);
      table.boolean("is_blocked").notNullable().defaultTo(false);
      table.timestamp("blocked_at").nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("kyc_decisions");
  await knex.schema.dropTableIfExists("kyc_files");
  await knex.schema.dropTableIfExists("kyc_user_settings");
  await knex.schema.dropTableIfExists("kyc_applications");
  await knex.schema.dropTableIfExists("kyc_reason_codes");
}
