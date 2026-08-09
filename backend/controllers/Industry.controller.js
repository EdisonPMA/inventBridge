/**
 * Industry controller
 * Routes: GET /api/industries, GET /api/industries/:id,
 *         POST /api/industries (admin), PUT /api/industries/:id (admin),
 *         DELETE /api/industries/:id (admin)
 */
const Industry = require("../models/Industry.model");

/* â”€â”€ GET /api/industries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getAllIndustries(req, res) {
  try {
    const { status } = req.query;
    const industries = await Industry.findAll({ status });
    return res.json({ industries });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/industries/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getIndustryById(req, res) {
  try {
    const industry = await Industry.findById(req.params.id);
    return res.json({ industry });
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
}

/* â”€â”€ POST /api/industries  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function createIndustry(req, res) {
  try {
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ message: "name is required." });
    const industry = await Industry.create({ name, description, icon });
    return res.status(201).json({ message: "Industry created.", industry });
  } catch (err) {
    const status = err.message.includes("already exists") ? 409 : 400;
    return res.status(status).json({ message: err.message });
  }
}

/* â”€â”€ PUT /api/industries/:id  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function updateIndustry(req, res) {
  try {
    const industry = await Industry.update(req.params.id, req.body);
    return res.json({ message: "Industry updated.", industry });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ DELETE /api/industries/:id  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function deleteIndustry(req, res) {
  try {
    const result = await Industry.remove(req.params.id);
    return res.json(result);
  } catch (err) {
    const status = err.message.includes("Cannot delete") ? 409 : 400;
    return res.status(status).json({ message: err.message });
  }
}

module.exports = {
  getAllIndustries, getIndustryById,
  createIndustry, updateIndustry, deleteIndustry,
};

