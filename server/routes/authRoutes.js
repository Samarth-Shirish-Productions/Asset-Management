const express = require('express');
const passport = require('passport');
const multer = require('multer');
const authController = require('../controllers/authController');
const twoFAController = require('../controllers/twoFAController');
const passkeyController = require('../controllers/passkeyController');
const userController = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

// Multer — store uploaded files in memory (no disk write)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',                                           // .xls
      'text/csv',                                                            // .csv
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) or CSV files are allowed.'));
    }
  },
});

const router = express.Router();

// Standard Auth Routes
router.post('/register', authLimiter, authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', authLimiter, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/verify-reset-otp', authLimiter, authController.verifyResetOTP);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Profile & Logs
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.get('/login-activity', protect, authController.getLoginActivity);

// TOTP 2FA Routes
router.post('/2fa/setup', protect, twoFAController.setup2FA);
router.post('/2fa/verify', protect, twoFAController.verifyAndEnable2FA);
router.post('/2fa/disable', protect, twoFAController.disable2FA);
router.post('/2fa/login', authLimiter, twoFAController.verify2FALogin);

// WebAuthn Passkey Routes
router.get('/passkey/register-options', protect, passkeyController.registerOptions);
router.post('/passkey/register-verify', protect, passkeyController.registerVerify);
router.get('/passkey/login-options', passkeyController.loginOptions);
router.post('/passkey/login-verify', passkeyController.loginVerify);
router.get('/passkey/list', protect, passkeyController.listPasskeys);
router.delete('/passkey/:credentialId', protect, passkeyController.deletePasskey);

// Google OAuth Strategy Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=unauthorized` }), (req, res) => {
  const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
  const accessToken = generateAccessToken(req.user);
  const refreshToken = generateRefreshToken(req.user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?token=${accessToken}`);
});

// Microsoft OAuth Strategy Routes
router.get('/microsoft', passport.authenticate('microsoft', { prompt: 'select_account' }));
router.get('/microsoft/callback', passport.authenticate('microsoft', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=unauthorized` }), (req, res) => {
  const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
  const accessToken = generateAccessToken(req.user);
  const refreshToken = generateRefreshToken(req.user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?token=${accessToken}`);
});

// GitHub OAuth Strategy Routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'], prompt: 'select_account' }));
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=unauthorized` }), (req, res) => {
  const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
  const accessToken = generateAccessToken(req.user);
  const refreshToken = generateRefreshToken(req.user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?token=${accessToken}`);
});

// ─── Admin: User Management Routes ───────────────────────────────────────────
router.get('/admin/users',           protect, adminOnly, userController.listUsers);
router.post('/admin/add-user',       protect, adminOnly, userController.addUser);
router.post('/admin/bulk-add-users', protect, adminOnly, upload.single('file'), userController.bulkAddUsers);
router.put('/admin/users/:id',       protect, adminOnly, userController.updateUser);
router.delete('/admin/users/:id',    protect, adminOnly, userController.deleteUser);

module.exports = router;
