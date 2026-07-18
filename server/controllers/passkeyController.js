const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const User = require('../models/User');
const { sendTokens } = require('../utils/jwt');

// Relying Party Settings
const rpName = process.env.RP_NAME || 'Enterprise Asset Management System';
const rpID = process.env.RP_ID || 'localhost';
const expectedOrigin = process.env.EXPECTED_ORIGIN || 'http://localhost:5173';

// 1. Generate Registration Options (User must be logged in to register a passkey)
exports.registerOptions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      // v13 requires a native Uint8Array — TextEncoder.encode() is the correct approach
      userID: new TextEncoder().encode(user._id.toString()),
      userName: user.email,
      userDisplayName: user.fullName,
      // Allow multiple passkeys
      excludeCredentials: user.passkeys.map(p => ({
        id: Buffer.from(p.credentialID, 'base64url'),
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    // Store challenge in HttpOnly cookie
    res.cookie('registrationChallenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 5 * 60 * 1000, // 5 minutes
    });

    res.json(options);
  } catch (error) {
    console.error('Passkey register options error:', error);
    res.status(500).json({ success: false, message: 'Error generating registration options' });
  }
};

// 2. Verify Registration Response
exports.registerVerify = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const expectedChallenge = req.cookies.registrationChallenge;
    if (!expectedChallenge) {
      return res.status(400).json({ success: false, message: 'Registration challenge missing or expired' });
    }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      // v13: credentialID and credentialPublicKey are nested under registrationInfo.credential
      const { id: credentialID, publicKey: credentialPublicKey, counter } = verification.registrationInfo.credential;

      const credentialIDBase64 = Buffer.from(credentialID).toString('base64url');

      // Check if credential ID already exists
      const credentialExists = user.passkeys.some(p => p.credentialID === credentialIDBase64);
      if (!credentialExists) {
        user.passkeys.push({
          credentialID: credentialIDBase64,
          credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
          counter,
        });
        await user.save();
      }

      // Clear cookie
      res.clearCookie('registrationChallenge');

      return res.json({ success: true, message: 'Passkey registered successfully!' });
    }

    res.status(400).json({ success: false, message: 'Verification failed' });
  } catch (error) {
    console.error('Passkey register verify error:', error);
    res.status(500).json({ success: false, message: 'Error verifying registration' });
  }
};

// 3. Generate Authentication Options
exports.loginOptions = async (req, res) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
    });

    // Store challenge in HttpOnly cookie
    res.cookie('authenticationChallenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 5 * 60 * 1000, // 5 minutes
    });

    res.json(options);
  } catch (error) {
    console.error('Passkey login options error:', error);
    res.status(500).json({ success: false, message: 'Error generating authentication options' });
  }
};

// 4. Verify Authentication Response (Passwordless Login)
exports.loginVerify = async (req, res) => {
  try {
    const expectedChallenge = req.cookies.authenticationChallenge;
    if (!expectedChallenge) {
      return res.status(400).json({ success: false, message: 'Authentication challenge missing or expired' });
    }

    const { id } = req.body; // credentialID from client
    
    // Find user by credential ID
    const user = await User.findOne({ 'passkeys.credentialID': id });
    if (!user) {
      return res.status(400).json({ success: false, message: 'No user registered with this passkey' });
    }

    const passkey = user.passkeys.find(p => p.credentialID === id);

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialID,
        publicKey: Uint8Array.from(Buffer.from(passkey.credentialPublicKey, 'base64url')),
        counter: passkey.counter,
      },
    });

    if (verification.verified) {
      // Update counter
      passkey.counter = verification.authenticationInfo.counter;
      
      // Log login activity
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const device = req.headers['user-agent'] || 'unknown';
      user.loginActivity.push({ device, ip, type: 'Passkey' });
      await user.save();

      // Clear cookie
      res.clearCookie('authenticationChallenge');

      // Send tokens
      return sendTokens(res, user, 200);
    }

    res.status(400).json({ success: false, message: 'Passkey authentication failed' });
  } catch (error) {
    console.error('Passkey login verify error:', error);
    res.status(500).json({ success: false, message: 'Error verifying passkey authentication' });
  }
};
