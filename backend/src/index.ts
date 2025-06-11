// src/index.ts
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import { authenticateToken, AuthRequest } from "./middleware/authMiddleware";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Разрешаем *все* origin (удобно в dev)
app.use(cors());
// Разрешаем preflight для любых эндпоинтов
app.options("*", cors());

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Cashflow backend is running");
});

// Auth
app.use("/auth", authRoutes);

// Expenses
app.get("/expenses", authenticateToken, async (req: AuthRequest, res) => {
  const expenses = await prisma.expense.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json(expenses);
});

app.post("/expenses", authenticateToken, async (req: AuthRequest, res) => {
  const { amount, note } = req.body;
  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "Неверная сумма" });
  }
  const expense = await prisma.expense.create({
    data: { amount, note: note ?? "", userId: req.userId! },
  });
  res.status(201).json(expense);
});

// Глобальная обработка ошибок (опционально)
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
