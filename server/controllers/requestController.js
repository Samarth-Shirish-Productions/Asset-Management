const Request = require('../models/Request');
const Asset = require('../models/Asset');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');

// 1. Create Removal/Reassignment Request (Employee Only)
exports.createRequest = async (req, res) => {
  try {
    const { assetId, requestType, reason } = req.body;

    const asset = await Asset.findById(assetId);
    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Check if asset is assigned to the current employee requesting it
    if (asset.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only request removal/reassignment for assets assigned to you' });
    }

    // Check if there is already a pending request for this asset
    const pendingRequest = await Request.findOne({ asset: assetId, status: 'Pending' });
    if (pendingRequest) {
      return res.status(400).json({ success: false, message: 'There is already a pending request for this asset' });
    }

    const request = new Request({
      asset: assetId,
      employee: req.user._id,
      requestType,
      reason,
      status: 'Pending',
    });

    await request.save();

    // Notify Admin via email
    const admins = await User.find({ role: 'Admin' });
    const adminEmails = admins.map(a => a.email);

    if (adminEmails.length > 0) {
      const emailSubject = `New Asset Request: ${requestType} from ${req.user.fullName}`;
      const emailText = `Hello Admin,\n\nEmployee ${req.user.fullName} has requested a ${requestType} for asset ID ${asset.assetId} (${asset.name}).\nReason: ${reason}\n\nPlease review this request in the system dashboard.\n\nThank you!`;
      await sendEmail({
        to: adminEmails.join(','),
        subject: emailSubject,
        text: emailText,
      });
    }

    res.status(201).json({ success: true, message: 'Request submitted successfully!', request });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ success: false, message: 'Server error creating request' });
  }
};

// 2. Get Requests (Admin: all, Employee: own)
exports.getRequests = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'Employee') {
      query.employee = req.user.id;
    }

    const requests = await Request.find(query)
      .populate('asset', 'assetId name model status')
      .populate('employee', 'fullName email department branch')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching requests' });
  }
};

// 3. Handle Request (Approve/Reject - Admin Only)
exports.handleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, adminRemarks } = req.body; // status = 'Approved' or 'Rejected'

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update' });
    }

    const request = await Request.findById(requestId)
      .populate('asset')
      .populate('employee');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'This request has already been handled' });
    }

    request.status = status;
    request.adminRemarks = adminRemarks;
    await request.save();

    const asset = request.asset;
    const employee = request.employee;

    if (status === 'Approved') {
      // Unassign the asset
      asset.assignedTo = null;
      asset.status = 'In Storage';
      asset.auditTrail.push({
        action: 'Assignment Removal',
        performedBy: req.user._id,
        details: `Approved removal request from ${employee.fullName}. Remarks: ${adminRemarks || 'None'}`
      });
      await asset.save();
    } else {
      // Audit log rejection
      asset.auditTrail.push({
        action: 'Request Rejected',
        performedBy: req.user._id,
        details: `Rejected removal request from ${employee.fullName}. Remarks: ${adminRemarks || 'None'}`
      });
      await asset.save();
    }

    // Send email notification to the employee
    const emailSubject = `Asset Request Update: Request ${status}`;
    const emailText = `Hello ${employee.fullName},\n\nYour request for the ${request.requestType} of asset ID ${asset.assetId} has been ${status}.\n\nAdmin Remarks: ${adminRemarks || 'None'}\n\nThank you!`;
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: ${status === 'Approved' ? '#10b981' : '#ef4444'};">Request ${status}</h2>
        <p>Hello <strong>${employee.fullName}</strong>,</p>
        <p>Your request for the <strong>${request.requestType}</strong> of asset <strong>${asset.name} (ID: ${asset.assetId})</strong> has been processed.</p>
        <p>Status: <strong style="color: ${status === 'Approved' ? '#10b981' : '#ef4444'};">${status}</strong></p>
        <p><strong>Admin Remarks:</strong> ${adminRemarks || 'None'}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #64748b; font-size: 14px;">This is an automated notification. Please check your dashboard for details.</p>
      </div>
    `;

    await sendEmail({
      to: employee.email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    });

    res.json({ success: true, message: `Request successfully ${status}!`, request });
  } catch (error) {
    console.error('Handle request error:', error);
    res.status(500).json({ success: false, message: 'Server error processing request' });
  }
};
