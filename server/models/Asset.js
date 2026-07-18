const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g. "Created", "Assigned", "Status Changed", "Updated"
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: String },
});

const assetSchema = new mongoose.Schema({
  assetId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  model: { type: String, required: true },
  serialNumber: { type: String, required: true, unique: true },
  category: { type: String, enum: ['Static', 'Movable'], required: true },
  subCategory: { type: String, required: true },
  department: { type: String, required: true },
  branch: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['Active', 'In Repair', 'Retired', 'Lost/Damaged', 'In Storage'], default: 'In Storage' },
  purchaseDate: { type: Date, required: true },
  purchaseValue: { type: Number, required: true },
  warrantyExpiry: { type: Date },
  warrantyProvider: { type: String },   // e.g. Dell ProSupport
  supportContact: { type: String },     // e.g. 1800-XXX-XXXX
  vendor: { type: String },
  imageUrl: { type: String },
  invoiceUrl: { type: String },
  qrCode: { type: String }, // QR code image string (data URI)
  notes: { type: String },
  maintenanceCost: { type: Number },          // Cost of last repair
  expectedReturnDate: { type: Date },         // Expected return from repair
  isDeleted: { type: Boolean, default: false }, // Soft delete support
  auditTrail: [auditLogSchema],
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
