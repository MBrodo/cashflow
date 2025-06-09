import express from "express";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import { authenticateToken, AuthRequest } from "./middleware/authMiddleware";

const prisma = new PrismaClient();
const app = express();
const PORT = 4000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Cashflow backend is running");
});

app.get("/expenses", authenticateToken, async (req: AuthRequest, res) => {
  const expenses = await prisma.expense.findMany({
    where: { userId: req.userId },
  });
  res.json(expenses);
});

app.post("/expenses", authenticateToken, async (req: AuthRequest, res) => {
  const { amount, note } = req.body;
  try {
    const expense = await prisma.expense.create({
      data: {
        amount,
        note,
        userId: req.userId!,
      },
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: "Failed to create expense" });
  }
});

app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
