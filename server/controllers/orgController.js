const Branch = require('../models/Branch');
const Department = require('../models/Department');

// ─── BRANCHES ────────────────────────────────────────────────────────────────

// GET all branches
exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ isDeleted: false }).sort({ name: 1 });
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching branches.' });
  }
};

// POST create branch
exports.createBranch = async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Branch name is required.' });
    }
    const exists = await Branch.findOne({ name: name.trim(), isDeleted: false });
    if (exists) {
      return res.status(400).json({ success: false, message: `Branch "${name}" already exists.` });
    }
    const branch = new Branch({ name: name.trim(), location: (location || '').trim() });
    await branch.save();
    res.status(201).json({ success: true, branch });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating branch.' });
  }
};

// PUT update branch
exports.updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;
    const branch = await Branch.findById(id);
    if (!branch || branch.isDeleted) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }
    if (name && name.trim() !== branch.name) {
      const exists = await Branch.findOne({ name: name.trim(), isDeleted: false });
      if (exists) {
        return res.status(400).json({ success: false, message: `Branch "${name}" already exists.` });
      }
      branch.name = name.trim();
    }
    if (location !== undefined) branch.location = location.trim();
    await branch.save();
    res.json({ success: true, branch });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating branch.' });
  }
};

// DELETE branch (soft)
exports.deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);
    if (!branch || branch.isDeleted) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }
    branch.isDeleted = true;
    await branch.save();
    res.json({ success: true, message: `Branch "${branch.name}" deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting branch.' });
  }
};

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────

// GET all departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isDeleted: false }).sort({ name: 1 });
    res.json({ success: true, departments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching departments.' });
  }
};

// POST create department
exports.createDepartment = async (req, res) => {
  try {
    const { name, branch } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }
    const exists = await Department.findOne({ name: name.trim(), isDeleted: false });
    if (exists) {
      return res.status(400).json({ success: false, message: `Department "${name}" already exists.` });
    }
    const dept = new Department({ name: name.trim(), branch: (branch || '').trim() });
    await dept.save();
    res.status(201).json({ success: true, department: dept });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating department.' });
  }
};

// PUT update department
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, branch } = req.body;
    const dept = await Department.findById(id);
    if (!dept || dept.isDeleted) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }
    if (name && name.trim() !== dept.name) {
      const exists = await Department.findOne({ name: name.trim(), isDeleted: false });
      if (exists) {
        return res.status(400).json({ success: false, message: `Department "${name}" already exists.` });
      }
      dept.name = name.trim();
    }
    if (branch !== undefined) dept.branch = branch.trim();
    await dept.save();
    res.json({ success: true, department: dept });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating department.' });
  }
};

// DELETE department (soft)
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await Department.findById(id);
    if (!dept || dept.isDeleted) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }
    dept.isDeleted = true;
    await dept.save();
    res.json({ success: true, message: `Department "${dept.name}" deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting department.' });
  }
};
