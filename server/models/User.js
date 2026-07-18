const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const loginActivitySchema = new mongoose.Schema({
  device: String,
  ip: String,
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['Password', 'Google', 'Passkey'] },
});

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String }, // optional for Google OAuth only users
  department: { type: String, required: true },
  branch: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Employee'], default: 'Employee' },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordOTP: String,
  resetPasswordOTPExpires: Date,
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  passkeys: [
    {
      credentialID: { type: String, required: true },
      credentialPublicKey: { type: String, required: true },
      counter: { type: Number, default: 0 },
      transports: [String],
    }
  ],
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  loginActivity: [loginActivitySchema],
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
