import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const reportTypesData = [
    { code: "spamFraud", is_comment_required: false, sort_order: 10 },
    { code: "abuseHarassment", is_comment_required: false, sort_order: 20 },
    { code: "inappropriateContent", is_comment_required: false, sort_order: 30 },
    { code: "copyrightViolation", is_comment_required: false, sort_order: 40 },
    { code: "illegalContent", is_comment_required: false, sort_order: 50 },
    { code: "misinformation", is_comment_required: false, sort_order: 60 },
    { code: "technicalIssue", is_comment_required: true, sort_order: 70 },
    { code: "other", is_comment_required: true, sort_order: 100 },
  ];

  const insertedTypes = await knex("report_types").insert(reportTypesData).returning("*");

  const translationsData: Array<{
    report_type_id: number;
    locale: string;
    title: string;
    description: string;
  }> = [];

  const ruTranslations = [
    { title: "Спам или мошенничество", description: "Подозрительные ссылки, реклама, попытки обмана" },
    { title: "Оскорбления или угрозы", description: "Токсичное поведение, буллинг, агрессия" },
    { title: "Неподобающий контент", description: "18+, шокирующий или нежелательный контент" },
    { title: "Нарушение авторских прав", description: "Использование чужих материалов без разрешения" },
    { title: "Запрещённый или незаконный контент", description: "Экстремизм, пропаганда незаконных действий" },
    { title: "Ложная информация", description: "Вводящие в заблуждение или фейковые данные" },
    { title: "Техническая проблема", description: "Контент не открывается или работает с ошибками" },
    { title: "Другое", description: "Другая причина" },
  ];

  const enTranslations = [
    { title: "Spam or Fraud", description: "Suspicious links, advertising, attempts to deceive" },
    { title: "Abuse or Harassment", description: "Toxic behavior, bullying, aggression" },
    { title: "Inappropriate Content", description: "18+, shocking or unwanted content" },
    { title: "Copyright Violation", description: "Use of others' materials without permission" },
    { title: "Illegal Content", description: "Extremism, propaganda of illegal activities" },
    { title: "Misinformation", description: "Misleading or fake data" },
    { title: "Technical Issue", description: "Content doesn't open or works with errors" },
    { title: "Other", description: "Other reason" },
  ];

  insertedTypes.forEach((type, index) => {
    translationsData.push({
      report_type_id: type.id,
      locale: "ru",
      title: ruTranslations[index].title,
      description: ruTranslations[index].description,
    });

    translationsData.push({
      report_type_id: type.id,
      locale: "en",
      title: enTranslations[index].title,
      description: enTranslations[index].description,
    });
  });

  await knex("report_type_translations").insert(translationsData);
}

export async function down(knex: Knex): Promise<void> {
  await knex("report_type_translations").del();
  await knex("report_types").whereIn("code", [
    "spamFraud", "abuseHarassment", "inappropriateContent", "copyrightViolation",
    "illegalContent", "misinformation", "technicalIssue", "other",
  ]).del();
}
