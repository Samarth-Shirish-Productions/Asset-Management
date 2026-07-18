require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Asset = require('./models/Asset');
const Counter = require('./models/Counter');
const Request = require('./models/Request');
const QRCode = require('qrcode');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/asset_management');
    console.log('Connected to MongoDB for seeding...');

    // Clear old data
    await User.deleteMany({});
    await Asset.deleteMany({});
    await Counter.deleteMany({});
    await Request.deleteMany({});
    console.log('Cleared existing collections.');

    // 1. Create Users
    const admin = new User({
      fullName: 'Shirish Kumar',
      email: 'admin@assetmgmt.com',
      password: 'Admin@12345',
      department: 'IT',
      branch: 'Pune',
      role: 'Admin',
      isVerified: true,
    });

    const employee = new User({
      fullName: 'Aditya Sen',
      email: 'employee@assetmgmt.com',
      password: 'Employee@12345',
      department: 'Finance',
      branch: 'Bangalore',
      role: 'Employee',
      isVerified: true,
    });

    await admin.save();
    await employee.save();
    console.log('Seeded Users: admin@assetmgmt.com & employee@assetmgmt.com');

    // 2. Setup counters for custom Asset ID generation
    const counters = [
      { id: 'PUN-IT-MOV', seq: 2 },
      { id: 'BLR-FIN-STA', seq: 2 },
      { id: 'HYD-HR-MOV', seq: 2 },
      { id: 'BOM-MKT-MOV', seq: 2 },
    ];
    await Counter.insertMany(counters);

    // 3. Create Sample Assets
    const assetsData = [
      {
        assetId: 'PUN-IT-MOV-0001',
        name: 'MacBook Pro 16',
        model: 'Apple Silicon M3 Max',
        serialNumber: 'C02F2345Q678',
        category: 'Movable',
        subCategory: 'Electronics',
        department: 'IT',
        branch: 'Pune',
        assignedTo: admin._id,
        status: 'Active',
        purchaseDate: new Date('2025-01-10'),
        purchaseValue: 2499,
        warrantyExpiry: new Date('2028-01-10'),
        vendor: 'Apple Authorized Reseller',
        notes: 'High-performance laptop for administrative coding.',
      },
      {
        assetId: 'PUN-IT-MOV-0002',
        name: 'Dell XPS 15',
        model: 'Dell XPS 9530',
        serialNumber: 'DL9530XYZ123',
        category: 'Movable',
        subCategory: 'Electronics',
        department: 'IT',
        branch: 'Pune',
        assignedTo: null,
        status: 'In Storage',
        purchaseDate: new Date('2025-02-15'),
        purchaseValue: 1899,
        warrantyExpiry: new Date('2027-02-15'),
        vendor: 'Dell India',
        notes: 'In storage, ready for deployment.',
      },
      {
        assetId: 'BLR-FIN-STA-0001',
        name: 'Ergonomic Desk',
        model: 'Featherlite Rise',
        serialNumber: 'FL-DSK-9876',
        category: 'Static',
        subCategory: 'Furniture',
        department: 'Finance',
        branch: 'Bangalore',
        assignedTo: employee._id,
        status: 'Active',
        purchaseDate: new Date('2024-06-20'),
        purchaseValue: 350,
        warrantyExpiry: new Date('2029-06-20'),
        vendor: 'Featherlite Office Furniture',
        notes: 'Height adjustable table for senior analyst.',
      },
      {
        assetId: 'BLR-FIN-STA-0002',
        name: 'Server Rack Cabinet',
        model: 'APC NetShelter 42U',
        serialNumber: 'APC-42U-5544',
        category: 'Static',
        subCategory: 'Electronics',
        department: 'Finance',
        branch: 'Bangalore',
        assignedTo: null,
        status: 'Active',
        purchaseDate: new Date('2023-11-05'),
        purchaseValue: 1200,
        warrantyExpiry: new Date('2028-11-05'),
        vendor: 'APC India',
        notes: 'Anchored in main server room.',
      },
      {
        assetId: 'HYD-HR-MOV-0001',
        name: 'iPad Pro 11',
        model: 'Apple iPad Pro M2',
        serialNumber: 'IPD-M2-7788',
        category: 'Movable',
        subCategory: 'Electronics',
        department: 'HR',
        branch: 'Hyderabad',
        assignedTo: null,
        status: 'In Repair',
        purchaseDate: new Date('2024-03-12'),
        purchaseValue: 899,
        warrantyExpiry: new Date('2025-03-12'),
        vendor: 'Apple India',
        notes: 'Sent to Apple Service Center for screen replacement.',
      },
      {
        assetId: 'HYD-HR-MOV-0002',
        name: 'ThinkPad T14',
        model: 'Lenovo ThinkPad Gen 4',
        serialNumber: 'TP-T14-9988',
        category: 'Movable',
        subCategory: 'Electronics',
        department: 'HR',
        branch: 'Hyderabad',
        assignedTo: null,
        status: 'In Storage',
        purchaseDate: new Date('2024-09-01'),
        purchaseValue: 1100,
        warrantyExpiry: new Date('2026-09-01'),
        vendor: 'Lenovo Commercial',
      },
      {
        assetId: 'BOM-MKT-MOV-0001',
        name: 'Sony FX3 Cinema Camera',
        model: 'Sony ILME-FX3',
        serialNumber: 'SONY-FX3-2211',
        category: 'Movable',
        subCategory: 'Electronics',
        department: 'Marketing',
        branch: 'Mumbai',
        assignedTo: null,
        status: 'Lost/Damaged',
        purchaseDate: new Date('2024-08-10'),
        purchaseValue: 3899,
        warrantyExpiry: new Date('2026-08-10'),
        vendor: 'Sony India',
        notes: 'Damaged during external location shoot. Unusable.',
      },
      {
        assetId: 'BOM-MKT-MOV-0002',
        name: 'DJI Ronin RS3 Gimbal',
        model: 'DJI RS3 Pro',
        serialNumber: 'DJI-RS3P-5566',
        category: 'Movable',
        subCategory: 'Electronics',
        department: 'Marketing',
        branch: 'Mumbai',
        assignedTo: null,
        status: 'In Storage',
        purchaseDate: new Date('2024-08-12'),
        purchaseValue: 649,
        warrantyExpiry: new Date('2025-08-12'),
        vendor: 'DJI Authorized Store',
      }
    ];

    // Auto-generate QR codes and audit trails for seeded assets
    for (let assetData of assetsData) {
      assetData.qrCode = await QRCode.toDataURL(assetData.assetId);
      assetData.auditTrail = [{
        action: 'Created',
        performedBy: admin._id,
        details: 'Initial system seeding.',
        timestamp: assetData.purchaseDate
      }];

      if (assetData.assignedTo) {
        assetData.auditTrail.push({
          action: 'Assignment',
          performedBy: admin._id,
          details: `Assigned on system setup.`,
          timestamp: new Date()
        });
      }
      
      const newAsset = new Asset(assetData);
      await newAsset.save();
    }

    console.log('Seeded 8 assets with automatic QR Codes & Audit logs.');
    console.log('Seeding complete. Exiting.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
