const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendTokens } = require('../utils/jwt');
const { sendEmail } = require('../utils/email');

// 1. Register User
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, department, branch } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    user = new User({
      fullName,
      email,
      password,
      department,
      branch,
      role: 'Employee', // Default role is Employee. Admin accounts created manually or seeded.
      verificationToken,
      isVerified: false,
    });

    await user.save();

    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    const emailSubject = 'Verify your Asset Management Account';
    const emailText = `Hello ${fullName},\n\nPlease verify your account by clicking the link below:\n${verificationLink}\n\nThank you!`;
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Asset Management System</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Thank you for registering. Please click the button below to verify your email and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="color: #64748b; font-size: 14px; word-break: break-all;">${verificationLink}</p>
      </div>
    `;

    await sendEmail({ to: email, subject: emailSubject, text: emailText, html: emailHtml });

    const isMockEmail = !process.env.SMTP_HOST || process.env.SMTP_HOST.includes('placeholder') || process.env.SMTP_USER.includes('placeholder');
    res.status(201).json({
      success: true,
      message: isMockEmail 
        ? `Registration successful! (DEV MODE: Click to verify in terminal or check server logs)` 
        : 'Registration successful! Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// 2. Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, message: 'Server error during email verification' });
  }
};

// 3. Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Check account lock status
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(403).json({
        success: false,
        message: `Account locked due to consecutive failed attempts. Try again in ${remainingMinutes} minutes.`,
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email before logging in.',
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Increment login attempts
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // 15-minute lock
        user.loginAttempts = 0;
      }
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    // Log Activity
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const device = req.headers['user-agent'] || 'unknown';
    user.loginActivity.push({ device, ip, type: 'Password' });
    
    // Cap activity logs at 50 to avoid bloated user documents
    if (user.loginActivity.length > 50) {
      user.loginActivity.shift();
    }
    await user.save();

    // If 2FA enabled, stop here and prompt for 2FA token
    if (user.twoFactorEnabled) {
      return res.json({
        success: true,
        require2FA: true,
        userId: user._id,
      });
    }

    // Send JWT tokens
    sendTokens(res, user, 200);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// 4. Refresh Token
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token missing' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_key_12345');
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Refresh token expired or invalid' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    sendTokens(res, user, 200);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, message: 'Server error during refresh' });
  }
};

// 5. Logout User
exports.logout = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ success: true, message: 'Logged out successfully' });
};

// 6. Forgot Password (OTP Generation)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User with this email does not exist' });
    }

    // Generate a 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = Date.now() + 15 * 60 * 1000; // 15 mins expiry
    await user.save();

    // Send OTP via email
    const emailSubject = 'Reset Password Verification Code';
    const emailText = `Hello,\n\nYour reset password OTP is: ${otp}\nThis code is valid for 15 minutes.\n\nThank you!`;
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Password Reset OTP</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. Use the following 6-digit verification code:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; border: 2px dashed #4f46e5; padding: 10px 20px; border-radius: 6px;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">This code will expire in 15 minutes. If you did not request a password reset, please ignore this email.</p>
      </div>
    `;

    await sendEmail({ to: email, subject: emailSubject, text: emailText, html: emailHtml });

    const isMockEmail = !process.env.SMTP_HOST || process.env.SMTP_HOST.includes('placeholder') || process.env.SMTP_USER.includes('placeholder');
    res.json({ 
      success: true, 
      message: isMockEmail ? `Reset password OTP sent! (DEV MODE OTP: ${otp})` : 'Reset password OTP sent to email' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error during forgot password' });
  }
};

// 6.5 Verify Reset Password OTP
exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
    }

    res.json({ success: true, message: 'OTP verified successfully!' });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error during OTP verification' });
  }
};

// 7. Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
    }

    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    
    // Clear lock status if any
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    res.json({ success: true, message: 'Password reset successful! You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error during password reset' });
  }
};

// 8. Get Current Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
};

// 9. Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, department, branch } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (fullName) user.fullName = fullName;
    if (department) user.department = department;
    if (branch) user.branch = branch;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        branch: user.branch,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

// 10. Fetch Login Activity logs
exports.getLoginActivity = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('loginActivity');
    res.json({ success: true, logs: user.loginActivity || [] });
  } catch (error) {
    console.error('Get login activity error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching login activity logs' });
  }
};
