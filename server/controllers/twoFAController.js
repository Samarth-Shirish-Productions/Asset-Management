const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { sendTokens } = require('../utils/jwt');

// 1. Setup 2FA (Generate Secret and QR Code)
exports.setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate secret key
    const secret = speakeasy.generateSecret({
      name: `AssetMgmt:${user.email}`,
    });

    // Save secret key temporarily in user profile (we won't set twoFactorEnabled = true yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code data URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      qrCode: qrCodeUrl,
      secret: secret.base32,
    });
  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({ success: false, message: 'Server error setting up 2FA' });
  }
};

// 2. Verify and Enable 2FA
exports.verifyAndEnable2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: '2FA has not been set up yet' });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1, // Allow 1 step tolerance before/after
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid 2FA token' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({
      success: true,
      message: '2FA enabled successfully!',
    });
  } catch (error) {
    console.error('Verify and Enable 2FA error:', error);
    res.status(500).json({ success: false, message: 'Server error enabling 2FA' });
  }
};

// 3. Disable 2FA
exports.disable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ success: false, message: 'Server error disabling 2FA' });
  }
};

// 4. Authenticate Login Token
exports.verify2FALogin = async (req, res) => {
  try {
    const { userId, token } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: 'User or 2FA setup not found' });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid 2FA token' });
    }

    // Log Activity
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const device = req.headers['user-agent'] || 'unknown';
    user.loginActivity.push({ device, ip, type: 'Password' });
    await user.save();

    // Authenticate and send tokens
    sendTokens(res, user, 200);
  } catch (error) {
    console.error('Verify 2FA login error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying login code' });
  }
};
