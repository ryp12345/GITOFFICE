const StaffQualification = require('../../models/staffQualification.model');

const getAllByStaffId = async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const qualifications = await StaffQualification.getAllByStaffId(staffId);
    res.json(qualifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const qualification = await StaffQualification.create(staffId, req.body);
    res.status(201).json(qualification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const id = req.params.id;
    const qualification = await StaffQualification.update(id, req.body);
    res.json(qualification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await StaffQualification.delete(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllByStaffId,
  create,
  update,
  remove,
};
