const Designation = require('../models/designation.model');

const designationController = {
  async getAll(req, res) {
    try {
      const data = await Designation.getAll();
      res.json({ data });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch designations' });
    }
  },
  async getById(req, res) {
    try {
      const data = await Designation.getById(req.params.id);
      if (!data) return res.status(404).json({ error: 'Not found' });
      res.json({ data });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch designation' });
    }
  },
  async create(req, res) {
    try {
      const data = await Designation.create(req.body);
      res.status(201).json({ data });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create designation' });
    }
  },
  async update(req, res) {
    try {
      const data = await Designation.update(req.params.id, req.body);
      res.json({ data });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update designation' });
    }
  },
  async delete(req, res) {
    try {
      await Designation.delete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete designation' });
    }
  },
};

module.exports = designationController;
