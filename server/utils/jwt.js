const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'dev_jwt_secret_key_12345',
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_key_12345',
    { expiresIn: '7d' }
  );
};

const sendTokens = (res, user, statusCode = 200, additionalData = {}) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(statusCode).json({
    success: true,
    accessToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      department: user.department,
      branch: user.branch,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      hasPasskey: user.passkeys && user.passkeys.length > 0,
    },
    ...additionalData
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  sendTokens,
};
