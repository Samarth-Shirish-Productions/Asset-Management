const Asset = require('../models/Asset');
const Counter = require('../models/Counter');
const User = require('../models/User');
const QRCode = require('qrcode');
const XLSX = require('xlsx');

// Helper to get short codes for ID generation
const getShortCodes = (branch, dept, category) => {
  const branches = {
    'pune': 'PUN',
    'bangalore': 'BLR',
    'hyderabad': 'HYD',
    'mumbai': 'BOM'
  };
  const depts = {
    'it': 'IT',
    'hr': 'HR',
    'human resources': 'HR',
    'finance': 'FIN',
    'marketing': 'MKT',
    'design': 'DSN',
    'video editing': 'VID',
    'project management': 'PM'
  };
  const categories = {
    'static': 'STA',
    'movable': 'MOV'
  };

  const bCode = branches[branch.trim().toLowerCase()] || branch.trim().substring(0, 3).toUpperCase();
  const dCode = depts[dept.trim().toLowerCase()] || dept.trim().substring(0, 3).toUpperCase();
  const cCode = categories[category.trim().toLowerCase()] || category.trim().substring(0, 3).toUpperCase();

  return { bCode, dCode, cCode };
};

// 1. Create Asset (Admin Only)
exports.createAsset = async (req, res) => {
  try {
    const {
      name, model, serialNumber, category, subCategory,
      department, branch, purchaseDate, purchaseValue,
      warrantyExpiry, vendor, notes
    } = req.body;

    // Check serial number uniqueness
    const existing = await Asset.findOne({ serialNumber, isDeleted: false });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Asset with this serial number already exists' });
    }

    // Generate Asset ID
    const { bCode, dCode, cCode } = getShortCodes(branch, department, category);
    const counterKey = `${bCode}-${dCode}-${cCode}`;

    // Atomically increment counter
    const counter = await Counter.findOneAndUpdate(
      { id: counterKey },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqStr = String(counter.seq).padStart(4, '0');
    const assetId = `${bCode}-${dCode}-${cCode}-${seqStr}`;

    // Generate QR Code encoding the Asset ID
    const qrCode = await QRCode.toDataURL(assetId);

    // Handle files (Multer)
    let imageUrl = '';
    let invoiceUrl = '';

    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        imageUrl = `/uploads/${req.files.image[0].filename}`;
      }
      if (req.files.invoice && req.files.invoice[0]) {
        invoiceUrl = `/uploads/${req.files.invoice[0].filename}`;
      }
    }

    const asset = new Asset({
      assetId,
      name,
      model,
      serialNumber,
      category,
      subCategory,
      department,
      branch,
      purchaseDate,
      purchaseValue,
      warrantyExpiry,
      vendor,
      notes,
      imageUrl,
      invoiceUrl,
      qrCode,
      status: 'In Storage', // Default status on creation
      auditTrail: [{
        action: 'Created',
        performedBy: req.user._id,
        details: `Asset created with ID ${assetId}`,
      }]
    });

    await asset.save();
    res.status(201).json({ success: true, asset });
  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({ success: false, message: 'Server error creating asset' });
  }
};

// 2. Update Asset (Admin Only)
exports.updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    const asset = await Asset.findById(id);

    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Check serial number uniqueness if changed
    if (updates.serialNumber && updates.serialNumber !== asset.serialNumber) {
      const existing = await Asset.findOne({ serialNumber: updates.serialNumber, isDeleted: false });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Serial number already in use' });
      }
    }

    // Handle files (Multer)
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        updates.imageUrl = `/uploads/${req.files.image[0].filename}`;
      }
      if (req.files.invoice && req.files.invoice[0]) {
        updates.invoiceUrl = `/uploads/${req.files.invoice[0].filename}`;
      }
    }

    // Track audits for key modifications
    const changeLogs = [];
    if (updates.status && updates.status !== asset.status) {
      changeLogs.push(`Status changed from ${asset.status} to ${updates.status}`);
    }
    if (updates.name && updates.name !== asset.name) {
      changeLogs.push(`Name changed from ${asset.name} to ${updates.name}`);
    }

    const detailMsg = changeLogs.length > 0 ? changeLogs.join(', ') : 'Asset details updated';

    asset.auditTrail.push({
      action: 'Updated',
      performedBy: req.user._id,
      details: detailMsg,
    });

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key !== 'auditTrail' && key !== 'assetId') {
        asset[key] = updates[key];
      }
    });

    await asset.save();
    res.json({ success: true, asset });
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ success: false, message: 'Server error updating asset' });
  }
};

// 3. Delete Asset (Soft Delete, Admin Only)
exports.deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id);

    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    asset.isDeleted = true;
    asset.auditTrail.push({
      action: 'Deleted',
      performedBy: req.user._id,
      details: 'Asset soft-deleted',
    });

    await asset.save();
    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting asset' });
  }
};

// 4. Get Assets (Admin full view / paginated / filtered)
exports.getAssets = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, search, category, status,
      department, branch, assignedTo, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const query = { isDeleted: false };

    // Filtering logic
    if (category) query.category = category;
    if (status) query.status = status;
    if (department) query.department = department;
    if (branch) query.branch = branch;
    if (assignedTo === 'unassigned') {
      query.assignedTo = null;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Search logic (AND with filter)
    if (search) {
      query.$or = [
        { assetId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort logic
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const assets = await Asset.find(query)
      .populate('assignedTo', 'fullName email department branch')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Asset.countDocuments(query);

    res.json({
      success: true,
      assets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching assets' });
  }
};

// 5. Get Asset By ID
exports.getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('assignedTo', 'fullName email department branch')
      .populate('auditTrail.performedBy', 'fullName email role');

    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({ success: true, asset });
  } catch (error) {
    console.error('Get asset by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching asset details' });
  }
};

// 6. Get My Assigned Assets (Employee restricted view)
exports.getMyAssets = async (req, res) => {
  try {
    const assets = await Asset.find({ assignedTo: req.user._id, isDeleted: false });
    res.json({ success: true, assets });
  } catch (error) {
    console.error('Get my assets error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching your assets' });
  }
};

// 7. Assign / Reassign Asset (Admin Only)
exports.assignAsset = async (req, res) => {
  try {
    const { assetId, employeeId, notes } = req.body;
    
    const asset = await Asset.findById(assetId);
    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    let employee = null;
    let oldEmployeeName = asset.assignedTo ? 'unassigned' : '';
    
    if (employeeId) {
      employee = await User.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }
    }

    if (asset.assignedTo) {
      const oldEmp = await User.findById(asset.assignedTo);
      if (oldEmp) oldEmployeeName = oldEmp.fullName;
    }

    asset.assignedTo = employee ? employee._id : null;
    asset.status = employee ? 'Active' : 'In Storage';

    const assignText = employee 
      ? `Assigned to ${employee.fullName} (${employee.email})` 
      : 'Unassigned/Returned to storage';

    asset.auditTrail.push({
      action: 'Assignment',
      performedBy: req.user._id,
      details: `${assignText}. Reason: ${notes || 'N/A'}. Previous: ${oldEmployeeName || 'None'}`
    });

    await asset.save();
    res.json({ success: true, asset });
  } catch (error) {
    console.error('Assign asset error:', error);
    res.status(500).json({ success: false, message: 'Server error assigning asset' });
  }
};

// 8. Publicly Safe QR Details (No authorization needed, no sensitive fields)
exports.getPublicAssetDetails = async (req, res) => {
  try {
    const { assetId } = req.params;
    const asset = await Asset.findOne({ assetId, isDeleted: false })
      .select('assetId name model category subCategory department branch status warrantyExpiry');

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({ success: true, asset });
  } catch (error) {
    console.error('Get public asset details error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching QR code audit data' });
  }
};

// 9. Dashboard Analytics (Admin Only)
exports.getDashboardAnalytics = async (req, res) => {
  try {
    // 1. Core counters
    const totalAssets = await Asset.countDocuments({ isDeleted: false });
    const inStorage = await Asset.countDocuments({ status: 'In Storage', isDeleted: false });
    const active = await Asset.countDocuments({ status: 'Active', isDeleted: false });
    const inRepair = await Asset.countDocuments({ status: 'In Repair', isDeleted: false });
    const damaged = await Asset.countDocuments({ status: 'Lost/Damaged', isDeleted: false });

    // Calculate Total Asset Value
    const valueAggregation = await Asset.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, totalValue: { $sum: '$purchaseValue' } } }
    ]);
    const totalValue = valueAggregation.length > 0 ? valueAggregation[0].totalValue : 0;


    // 2. Aggregate status
    const statusData = [
      { name: 'Active', value: active },
      { name: 'In Storage', value: inStorage },
      { name: 'In Repair', value: inRepair },
      { name: 'Lost/Damaged', value: damaged },
    ];

    // 3. Aggregate by branch
    const branchStats = await Asset.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$branch', count: { $sum: 1 } } }
    ]);
    const branchData = branchStats.map(item => ({ name: item._id, value: item.count }));

    // 4. Aggregate by department
    const deptStats = await Asset.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);
    const departmentData = deptStats.map(item => ({ name: item._id, value: item.count }));

    // 5. Expiring warranties in next 60 days
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const expiringWarranties = await Asset.find({
      isDeleted: false,
      warrantyExpiry: { $gte: new Date(), $lte: sixtyDaysFromNow }
    }).select('assetId name model warrantyExpiry vendor');

    // 6. Recent Audit Activities
    const recentAssets = await Asset.find({ isDeleted: false })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('auditTrail.performedBy', 'fullName');

    const activityFeed = [];
    recentAssets.forEach(asset => {
      if (asset.auditTrail && asset.auditTrail.length > 0) {
        const lastAudit = asset.auditTrail[asset.auditTrail.length - 1];
        activityFeed.push({
          assetId: asset.assetId,
          name: asset.name,
          action: lastAudit.action,
          details: lastAudit.details,
          performedBy: lastAudit.performedBy ? lastAudit.performedBy.fullName : 'System',
          timestamp: lastAudit.timestamp,
        });
      }
    });

    // Sort feeds by timestamp descending
    activityFeed.sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      metrics: {
        totalAssets,
        totalValue,
        active,
        inStorage,
        inRepair,
        damaged
      },
      statusData,
      branchData,
      departmentData,
      expiringWarranties,
      activityFeed: activityFeed.slice(0, 10), // Return top 10
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error compiling dashboard analytics' });
  }
};

// 10. Bulk Create Assets via Excel (Admin Only)
exports.bulkCreateAssets = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Parse workbook
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded file is empty or has no data rows.' });
    }

    const VALID_CATEGORIES   = ['Static', 'Movable'];
    const VALID_STATUSES     = ['Active', 'In Repair', 'Retired', 'Lost/Damaged', 'In Storage'];

    const results = { total: rows.length, success: 0, failed: 0, errors: [], created: [] };

    for (let i = 0; i < rows.length; i++) {
      const row    = rows[i];
      const rowNum = i + 2; // +1 for header, +1 for 1-index

      // Normalised key getter (case-insensitive, trims whitespace)
      const get = (key) => {
        const found = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
        return found ? String(row[found]).trim() : '';
      };

      const name          = get('name');
      const model         = get('model');
      const serialNumber  = get('serialNumber');
      const category      = get('category');
      const subCategory   = get('subCategory');
      const department    = get('department');
      const branch        = get('branch');
      const purchaseDate  = get('purchaseDate');
      const purchaseValue = get('purchaseValue');
      const warrantyExpiry = get('warrantyExpiry');
      const vendor        = get('vendor');
      const notes         = get('notes');
      const status        = get('status') || 'In Storage';

      // ── Required field validation ──
      const rowErrors = [];
      if (!name)          rowErrors.push('name is required');
      if (!model)         rowErrors.push('model is required');
      if (!serialNumber)  rowErrors.push('serialNumber is required');
      if (!category)      rowErrors.push('category is required');
      else if (!VALID_CATEGORIES.includes(category))
        rowErrors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
      if (!subCategory)   rowErrors.push('subCategory is required');
      if (!department)    rowErrors.push('department is required');
      if (!branch)        rowErrors.push('branch is required');
      if (!purchaseDate)  rowErrors.push('purchaseDate is required (YYYY-MM-DD)');
      else if (isNaN(new Date(purchaseDate).getTime()))
        rowErrors.push('purchaseDate is not a valid date');
      if (!purchaseValue) rowErrors.push('purchaseValue is required');
      else if (isNaN(Number(purchaseValue)) || Number(purchaseValue) < 0)
        rowErrors.push('purchaseValue must be a positive number');
      if (status && !VALID_STATUSES.includes(status))
        rowErrors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);

      if (rowErrors.length > 0) {
        results.failed++;
        results.errors.push({ row: rowNum, serialNumber: serialNumber || '(empty)', errors: rowErrors });
        continue;
      }

      // ── Duplicate serial number check ──
      const existing = await Asset.findOne({ serialNumber, isDeleted: false });
      if (existing) {
        results.failed++;
        results.errors.push({ row: rowNum, serialNumber, errors: [`Serial number "${serialNumber}" already exists`] });
        continue;
      }

      try {
        // ── Generate Asset ID ──
        const { bCode, dCode, cCode } = getShortCodes(branch, department, category);
        const counterKey = `${bCode}-${dCode}-${cCode}`;
        const counter = await Counter.findOneAndUpdate(
          { id: counterKey },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        const seqStr  = String(counter.seq).padStart(4, '0');
        const assetId = `${bCode}-${dCode}-${cCode}-${seqStr}`;

        // ── Generate QR Code ──
        const qrCode = await QRCode.toDataURL(assetId);

        const asset = new Asset({
          assetId,
          name,
          model,
          serialNumber,
          category,
          subCategory,
          department,
          branch,
          purchaseDate: new Date(purchaseDate),
          purchaseValue: Number(purchaseValue),
          warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
          vendor: vendor || undefined,
          notes: notes || undefined,
          status,
          qrCode,
          auditTrail: [{
            action: 'Created',
            performedBy: req.user._id,
            details: `Bulk imported — Asset ID: ${assetId}`,
          }],
        });

        await asset.save();

        results.success++;
        results.created.push({ row: rowNum, assetId, name, serialNumber });
      } catch (saveErr) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          serialNumber,
          errors: [saveErr.message || 'Failed to save asset'],
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk import complete. ${results.success} asset(s) created, ${results.failed} failed.`,
      results,
    });
  } catch (error) {
    console.error('Bulk create assets error:', error);
    res.status(500).json({ success: false, message: 'Server error during bulk asset import.' });
  }
};

// 11. Log Maintenance (Admin Only)
exports.logMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { maintenanceCost, expectedReturnDate, notes } = req.body;

    const asset = await Asset.findById(id);
    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const previousStatus = asset.status;
    asset.status = 'In Repair';
    
    if (maintenanceCost !== undefined) {
      asset.maintenanceCost = maintenanceCost;
    }
    
    if (expectedReturnDate) {
      asset.expectedReturnDate = new Date(expectedReturnDate);
    }

    let detailMsg = `Flagged for maintenance. Cost: ${maintenanceCost || 'N/A'}`;
    if (expectedReturnDate) {
      detailMsg += `, Expected Return: ${new Date(expectedReturnDate).toLocaleDateString()}`;
    }
    if (notes) {
      detailMsg += ` - Notes: ${notes}`;
    }

    asset.auditTrail.push({
      action: 'Maintenance Logged',
      performedBy: req.user._id,
      details: detailMsg,
    });

    await asset.save();
    res.json({ success: true, asset, message: 'Maintenance logged successfully' });
  } catch (error) {
    console.error('Log maintenance error:', error);
    res.status(500).json({ success: false, message: 'Server error logging maintenance' });
  }
};
