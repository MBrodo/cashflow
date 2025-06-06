import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = 4000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Cashflow backend is running");
});

app.get("/expenses", async (req, res) => {
  const expenses = await prisma.expense.findMany();
  res.json(expenses);
});

app.post("/expenses", async (req, res) => {
  const { amount, note, userId } = req.body;
  try {
    const expense = await prisma.expense.create({
      data: {
        amount,
        note,
        userId,
      },
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: "Failed to create expense" });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
