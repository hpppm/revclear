import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth";
import {
  createItem,
  getItem,
  updateItem,
  deleteItem,
  queryItems,
  testTableName,
} from "../../../config/awsDynamoDb";

const router = Router();

// Middleware to check if DynamoDB is configured
router.use((req, res, next) => {
  if (!testTableName) {
    return res.status(503).json({
      error:
        "DynamoDB test table name is not configured. Cannot perform operations.",
    });
  }
  next();
});

// Create (Put) an item
router.post("/items", authMiddleware, async (req, res) => {
  const { item } = req.body;
  if (!item || !item.id) {
    return res.status(400).json({ error: "Item and item.id are required." });
  }
  try {
    await createItem(item);
    res.status(201).json({ message: "Item created successfully.", item });
  } catch (error: any) {
    console.error("DynamoDB create error:", error);
    res.status(500).json({ error: error.message || "Failed to create item." });
  }
});

// Read (Get) an item
router.get("/items/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const item = await getItem({ id });
    if (item) {
      res.status(200).json({ item });
    } else {
      res.status(404).json({ message: "Item not found." });
    }
  } catch (error: any) {
    console.error("DynamoDB get error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to retrieve item." });
  }
});

// Update an item
router.put("/items/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { updates } = req.body;
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Updates are required." });
  }
  try {
    const updatedItem = await updateItem({ id }, updates);
    res
      .status(200)
      .json({ message: "Item updated successfully.", item: updatedItem });
  } catch (error: any) {
    console.error("DynamoDB update error:", error);
    res.status(500).json({ error: error.message || "Failed to update item." });
  }
});

// Delete an item
router.delete("/items/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await deleteItem({ id });
    res.status(200).json({ message: "Item deleted successfully." });
  } catch (error: any) {
    console.error("DynamoDB delete error:", error);
    res.status(500).json({ error: error.message || "Failed to delete item." });
  }
});

// Query items (example: by a secondary index or a specific attribute)
// This is a generic example, actual query needs specific KeyConditionExpression
router.post("/query", authMiddleware, async (req, res) => {
  const {
    keyConditionExpression,
    expressionAttributeValues,
    expressionAttributeNames,
  } = req.body;
  if (!keyConditionExpression || !expressionAttributeValues) {
    return res.status(400).json({
      error:
        "KeyConditionExpression and ExpressionAttributeValues are required for query.",
    });
  }
  try {
    const items = await queryItems(
      keyConditionExpression,
      expressionAttributeValues,
      expressionAttributeNames
    );
    res.status(200).json({ items });
  } catch (error: any) {
    console.error("DynamoDB query error:", error);
    res.status(500).json({ error: error.message || "Failed to query items." });
  }
});

export default router;
