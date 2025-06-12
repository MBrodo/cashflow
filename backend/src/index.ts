// src/index.ts
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import { authenticateToken, AuthRequest } from "./middleware/authMiddleware";
import analyticsRouter from "./routes/analytics"; // Убедитесь, что файл src/routes/analytics.ts существует

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// CORS
app.use(cors());
app.options("*", cors());

// JSON body parser
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.send("Cashflow backend is running");
});

// Categories
app.get("/categories", async (_req, res) => {
  try {
    const list = await prisma.category.findMany({ orderBy: { name: "asc" } });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не удалось получить категории" });
  }
});

// Auth routes
app.use("/auth", authRoutes);

// Expenses
app.get("/expenses", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { userId: req.userId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не удалось получить расходы" });
  }
});

app.post("/expenses", authenticateToken, async (req: AuthRequest, res) => {
  const { amount, note, categoryId } = req.body;
  const catId = parseInt(String(categoryId), 10);

  if (typeof amount !== "number" || amount <= 0 || isNaN(catId)) {
    return res.status(400).json({ error: "Неверные данные для расхода" });
  }

  try {
    const expense = await prisma.expense.create({
      data: {
        amount,
        note: note ?? "",
        userId: req.userId!,
        categoryId: catId,
      },
      include: { category: true },
    });
    res.status(201).json(expense);
  } catch (err) {
    console.error("Error creating expense:", err);
    res.status(500).json({ error: "Не удалось сохранить расход" });
  }
});

// Analytics routes — обязательно после authenticateToken
app.use("/analytics/expenses", authenticateToken, analyticsRouter);

// Global error handler
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
);

app.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`);
});
