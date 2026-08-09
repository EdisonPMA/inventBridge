/**
 * Category controller
 * Routes: GET /api/categories, GET /api/categories/:id,
 *         POST /api/categories (admin), PUT /api/categories/:id (admin),
 *         DELETE /api/categories/:id (admin)
 */
const Category = require("../models/Category.model");

/* â”€â”€ GET /api/categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getAllCategories(req, res) {
  try {
    const { status } = req.query;
    const categories = await Category.findAll({ status });
    return res.json({ categories });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/categories/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getCategoryById(req, res) {
  try {
    const category = await Category.findById(req.params.id);
    return res.json({ category });
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
}

/* â”€â”€ POST /api/categories  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function createCategory(req, res) {
  try {
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ message: "name is required." });
    const category = await Category.create({ name, description, icon });
    return res.status(201).json({ message: "Category created.", category });
  } catch (err) {
    const status = err.message.includes("already exists") ? 409 : 400;
    return res.status(status).json({ message: err.message });
  }
}

/* â”€â”€ PUT /api/categories/:id  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function updateCategory(req, res) {
  try {
    const category = await Category.update(req.params.id, req.body);
    return res.json({ message: "Category updated.", category });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ DELETE /api/categories/:id  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function deleteCategory(req, res) {
  try {
    const result = await Category.remove(req.params.id);
    return res.json(result);
  } catch (err) {
    const status = err.message.includes("Cannot delete") ? 409 : 400;
    return res.status(status).json({ message: err.message });
  }
}

module.exports = {
  getAllCategories, getCategoryById,
  createCategory, updateCategory, deleteCategory,
};

