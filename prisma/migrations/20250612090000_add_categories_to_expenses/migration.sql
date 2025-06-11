-- 1) Создать таблицу Category
CREATE TABLE "Category" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "icon" TEXT NOT NULL
);

-- 2) Подготовить категории
INSERT INTO "Category"("name","icon") VALUES
  ('Кафе/Рестораны','fast-food-outline'),
  ('Транспорт','bus-outline'),
  ('Покупки','cart-outline'),
  ('Развлечения','film-outline'),
  ('Здоровье','heart-outline'),
  ('Услуги','flash-outline'),
  ('Подписки','card-outline'),
  ('Путешествия','airplane-outline'),
  ('Другое','ellipsis-horizontal');

-- 3) Добавить колонку categoryId в Expense с default = 9 («Другое»)
ALTER TABLE "Expense"
  ADD COLUMN "categoryId" INTEGER NOT NULL DEFAULT 9;

-- 4) Навесить внешний ключ
ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE RESTRICT;

-- 5) Убрать дефолт
ALTER TABLE "Expense"
  ALTER COLUMN "categoryId" DROP DEFAULT;
