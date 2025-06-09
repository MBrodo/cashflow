import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const app = express();
const PORT = 4000;
const JWT_SECRET = "your_jwt_secret"; // Лучше вынести в .env

// Расширяем Request, чтобы TS не ругался на userId
interface AuthenticatedRequest extends Request {
  userId?: number;
}

// Middleware для проверки токена и извлечения userId
function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    // @ts-ignore
    req.userId = (user as { userId: number }).userId;
    next();
  });
}

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Cashflow backend is running");
});

// Все запросы к /expenses защищены middleware
app.get(
  "/expenses",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const expenses = await prisma.expense.findMany({
      where: { userId: req.userId },
    });
    res.json(expenses);
  }
);

app.post(
  "/expenses",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { amount, note } = req.body;
    try {
      const expense = await prisma.expense.create({
        data: {
          amount,
          note,
          userId: req.userId!, // userId из токена, ! — говорим, что точно есть
        },
      });
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ error: "Failed to create expense" });
    }
  }
);

app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
