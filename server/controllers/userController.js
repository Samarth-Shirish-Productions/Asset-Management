const User = require('../models/User');
const crypto = require('crypto');
const XLSX = require('xlsx');
const { sendEmail } = require('../utils/email');

// ─── Helper: send welcome email with set-password link ───────────────────────
async function sendWelcomeEmail(user, tempPassword) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const subject = 'Welcome to AssetManager — Your Account Details';

  const passwordSection = tempPassword
    ? `<p>Your temporary password is: <strong style="color:#4f46e5;font-size:18px;">${tempPassword}</strong></p>
       <p style="color:#64748b;font-size:13px;">Please log in and change your password immediately.</p>`
    : `<p>An administrator has created an account for you. 
       <a href="${frontendUrl}/forgot-password" style="color:#4f46e5;">Click here to set your password.</a></p>`;

  const html = `
    <div style="font-family:sans-serif;padding:24px;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#4f46e5;margin-bottom:4px;">AssetManager</h2>
      <p style="color:#64748b;font-size:13px;margin-bottom:24px;">Enterprise Asset Management</p>
      <p>Hello <strong>${user.fullName}</strong>,</p>
      <p>Your account has been created by an administrator.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;width:140px;">Email</td>
            <td style="padding:8px;border:1px solid #e2e8f0;">${user.email}</td></tr>
        <tr><td style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;">Department</td>
            <td style="padding:8px;border:1px solid #e2e8f0;">${user.department}</td></tr>
        <tr><td style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;">Branch</td>
            <td style="padding:8px;border:1px solid #e2e8f0;">${user.branch}</td></tr>
        <tr><td style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;">Role</td>
            <td style="padding:8px;border:1px solid #e2e8f0;">${user.role}</td></tr>
      </table>
      ${passwordSection}
      <div style="text-align:center;margin:24px 0;">
        <a href="${frontendUrl}/login" style="background:#4f46e5;color:white;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">Go to Login</a>
      </div>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject,
    text: `Hello ${user.fullName}, your account has been created. Login at: ${frontendUrl}/login`,
    html,
  });
}

// ─── 1. Add Individual User (Admin only) ─────────────────────────────────────
exports.addUser = async (req, res) => {
  try {
    const { fullName, email, department, branch, role, password } = req.body;

    // Validate required fields
    if (!fullName || !email || !department || !branch) {
      return res.status(400).json({
        success: false,
        message: 'fullName, email, department, and branch are required fields.',
      });
    }

    // Check duplicate
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `User with email "${email}" already exists.` });
    }

    // Build user object
    const userData = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      department: department.trim(),
      branch: branch.trim(),
      role: role === 'Admin' ? 'Admin' : 'Employee',
      isVerified: true, // Admin-created users are pre-verified
    };

    // Assign password (or generate a random one)
    let tempPassword = null;
    if (password && password.trim()) {
      userData.password = password.trim();
    } else {
      // Generate a readable temp password
      tempPassword = crypto.randomBytes(5).toString('hex') + 'A1!';
      userData.password = tempPassword;
    }

    const user = new User(userData);
    await user.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(user, tempPassword);
    } catch (emailErr) {
      console.error('Welcome email failed (non-fatal):', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: `User "${fullName}" created successfully. A welcome email has been sent to ${email}.`,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        branch: user.branch,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating user.' });
  }
};

// ─── 2. Bulk Add Users via Excel (Admin only) ────────────────────────────────
exports.bulkAddUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Parse workbook from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded file is empty or has no data rows.' });
    }

    const results = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: [],
      created: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header row

      // Normalize keys (trim whitespace, handle case)
      const get = (key) => {
        const found = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
        return found ? String(row[found]).trim() : '';
      };

      const fullName = get('fullName');
      const email = get('email');
      const department = get('department');
      const branch = get('branch');
      const role = get('role');
      const password = get('password');

      // Validate required fields
      const rowErrors = [];
      if (!fullName) rowErrors.push('fullName is missing');
      if (!email) rowErrors.push('email is missing');
      if (!department) rowErrors.push('department is missing');
      if (!branch) rowErrors.push('branch is missing');

      // Basic email format check
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push(`"${email}" is not a valid email address`);
      }

      if (rowErrors.length > 0) {
        results.failed++;
        results.errors.push({ row: rowNum, email: email || '(empty)', errors: rowErrors });
        continue;
      }

      // Check for duplicate in DB
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        results.failed++;
        results.errors.push({ row: rowNum, email, errors: [`Email "${email}" already exists`] });
        continue;
      }

      // Build user
      let tempPassword = null;
      const userData = {
        fullName: fullName,
        email: email.toLowerCase(),
        department,
        branch,
        role: role === 'Admin' ? 'Admin' : 'Employee',
        isVerified: true,
      };

      if (password) {
        userData.password = password;
      } else {
        tempPassword = crypto.randomBytes(5).toString('hex') + 'A1!';
        userData.password = tempPassword;
      }

      try {
        const user = new User(userData);
        await user.save();

        // Send welcome email (non-blocking per user)
        sendWelcomeEmail(user, tempPassword).catch(err =>
          console.error(`Welcome email failed for ${email}:`, err.message)
        );

        results.success++;
        results.created.push({ row: rowNum, email, fullName });
      } catch (saveErr) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          email,
          errors: [saveErr.message || 'Failed to save user'],
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk upload complete. ${results.success} user(s) created, ${results.failed} failed.`,
      results,
    });
  } catch (error) {
    console.error('Bulk add users error:', error);
    res.status(500).json({ success: false, message: 'Server error during bulk user upload.' });
  }
};

// ─── 3. List Users (Admin only) ──────────────────────────────────────────────
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find({ isDeleted: false })
      .select('-password -verificationToken -resetPasswordOTP -resetPasswordOTPExpires -twoFactorSecret -passkeys -loginActivity')
      .sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching users.' });
  }
};

// ─── 4. Update User (Admin only) ─────────────────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, department, branch, role } = req.body;

    const user = await User.findById(id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check email uniqueness if changed
    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
      if (existing) {
        return res.status(400).json({ success: false, message: `Email "${email}" is already in use.` });
      }
      user.email = email.toLowerCase().trim();
    }

    if (fullName) user.fullName = fullName.trim();
    if (department) user.department = department.trim();
    if (branch) user.branch = branch.trim();
    if (role === 'Admin' || role === 'Employee') user.role = role;

    await user.save();

    res.json({
      success: true,
      message: `User "${user.fullName}" updated successfully.`,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        branch: user.branch,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating user.' });
  }
};

// ─── 5. Delete User — Soft Delete (Admin only) ───────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const user = await User.findById(id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isDeleted = true;
    await user.save();

    res.json({ success: true, message: `User "${user.fullName}" has been deactivated.` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting user.' });
  }
};
