// src/routes/analytics.ts
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/authMiddleware";

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /analytics/expenses
 * Query:
 *   from=YYYY-MM-DD      — обязательный
 *   to=YYYY-MM-DD        — обязательный
 *   groupBy=category|day|week|month  — обязательный
 *   categories=1&categories=3        — необязательно
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    // Извлекаем необработанные query-параметры
    const {
      from: rawFrom,
      to: rawTo,
      groupBy: rawGroupBy,
      categories: rawCats,
    } = req.query;
    // userId прописывается в authenticateToken → req.userId
    const userId = (req as AuthRequest).userId!;

    // Приводим к строкам
    const fromStr =
      typeof rawFrom === "string"
        ? rawFrom
        : Array.isArray(rawFrom) && typeof rawFrom[0] === "string"
        ? rawFrom[0]
        : "";
    const toStr =
      typeof rawTo === "string"
        ? rawTo
        : Array.isArray(rawTo) && typeof rawTo[0] === "string"
        ? rawTo[0]
        : "";
    const groupBy =
      typeof rawGroupBy === "string"
        ? rawGroupBy
        : Array.isArray(rawGroupBy) && typeof rawGroupBy[0] === "string"
        ? rawGroupBy[0]
        : "";

    // Валидация обязательных параметров
    if (!fromStr || !toStr || !groupBy) {
      return res.status(400).json({ error: "Missing from, to or groupBy" });
    }
    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    if (!["category", "day", "week", "month"].includes(groupBy)) {
      return res.status(400).json({ error: "Invalid groupBy value" });
    }

    // Базовый where по дате и пользователю
    const where: any = {
      userId,
      createdAt: { gte: fromDate, lte: toDate },
    };

    // Фильтр по категориям
    if (rawCats) {
      // Приводим rawCats к массиву строк
      let catsArray: string[] = [];
      if (typeof rawCats === "string") {
        catsArray = [rawCats];
      } else if (Array.isArray(rawCats)) {
        // выбрасываем все не-string
        catsArray = rawCats.filter((c): c is string => typeof c === "string");
      }
      // Парсим числа
      const cats = catsArray
        .map((c) => parseInt(c, 10))
        .filter((n) => !isNaN(n));
      if (cats.length) {
        where.categoryId = { in: cats };
      }
    }

    // Группировка по категориям
    if (groupBy === "category") {
      const sums = await prisma.expense.groupBy({
        by: ["categoryId"],
        where,
        _sum: { amount: true },
      });
      const categoriesData = await prisma.category.findMany({
        where: { id: { in: sums.map((s) => s.categoryId) } },
      });
      const data = sums.map((s) => ({
        key: s.categoryId,
        label: categoriesData.find((c) => c.id === s.categoryId)?.name || "—",
        total: s._sum.amount,
      }));
      return res.json({ data });
    }

    // Группировка по периодам (day/week/month) через raw SQL
    let periodExpr: string;
    switch (groupBy) {
      case "day":
        periodExpr = `to_char("createdAt",'YYYY-MM-DD')`;
        break;
      case "week":
        periodExpr = `to_char(date_trunc('week',"createdAt"),'IYYY-"W"IW')`;
        break;
      case "month":
        periodExpr = `to_char(date_trunc('month',"createdAt"),'YYYY-MM')`;
        break;
      default:
        periodExpr = `to_char("createdAt",'YYYY-MM-DD')`;
    }

    const params: any[] = [
      userId,
      fromDate.toISOString(),
      toDate.toISOString(),
    ];
    let catClause = "";
    if (where.categoryId) {
      const ids = where.categoryId.in as number[];
      catClause = ` AND "categoryId" IN (${ids
        .map((_, i) => `$${4 + i}`)
        .join(",")})`;
      params.push(...ids);
    }

    const raw = await prisma.$queryRawUnsafe(
      `
      SELECT ${periodExpr} AS period, SUM("amount") AS total
      FROM "Expense"
      WHERE "userId" = $1
        AND "createdAt" BETWEEN $2::timestamp AND $3::timestamp
        ${catClause}
      GROUP BY period
      ORDER BY period
      `,
      ...params
    );
    const data = (raw as Array<{ period: string; total: string }>).map((r) => ({
      key: r.period,
      label: r.period,
      total: parseFloat(r.total),
    }));

    return res.json({ data });
  } catch (err) {
    console.error("[/analytics/expenses]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
