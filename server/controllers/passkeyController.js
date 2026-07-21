const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const User = require('../models/User');
const { sendTokens } = require('../utils/jwt');
const { saveChallenge, consumeChallenge } = require('../utils/challengeStore');

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
      // v13: userID must be a Uint8Array (TextEncoder is safe on Node 11+)
      userID: new TextEncoder().encode(user._id.toString()),
      userName: user.email,
      userDisplayName: user.fullName,
      // v13: excludeCredentials[].id must be a Base64URLString (string), NOT a Buffer/Uint8Array
      excludeCredentials: user.passkeys.map(p => ({
        id: p.credentialID, // already stored as base64url string in DB
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    // Store challenge server-side; return opaque token to client
    const challengeToken = saveChallenge(options.challenge);

    res.json({ ...options, challengeToken });
  } catch (error) {
    console.error('Passkey register options error:', error);
    res.status(500).json({ success: false, message: 'Error generating registration options: ' + error.message });
  }
};

// 2. Verify Registration Response
exports.registerVerify = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Client echoes back the challengeToken it received from registerOptions
    const { challengeToken, ...credential } = req.body;
    const expectedChallenge = consumeChallenge(challengeToken);
    if (!expectedChallenge) {
      return res.status(400).json({ success: false, message: 'Registration challenge missing or expired' });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false, // matches userVerification: 'preferred' in generateRegistrationOptions
    });

    if (verification.verified && verification.registrationInfo) {
      // v13: registrationInfo.credential.id  → Base64URLString
      //      registrationInfo.credential.publicKey → Uint8Array
      const { id: credentialID, publicKey: credentialPublicKey, counter } = verification.registrationInfo.credential;

      // credentialID is already a Base64URLString in v13 — store directly
      const credentialExists = user.passkeys.some(p => p.credentialID === credentialID);
      if (!credentialExists) {
        user.passkeys.push({
          credentialID,
          credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
          counter,
          // transports tells us the device type: 'internal' = platform (Windows Hello/Face ID),
          // 'usb' = hardware key, 'hybrid' = phone/synced passkey, etc.
          transports: credential.response?.transports || [],
          createdAt: new Date(),
        });
        await user.save();
      }

      return res.json({ success: true, message: 'Passkey registered successfully!' });
    }

    res.status(400).json({ success: false, message: 'Verification failed' });
  } catch (error) {
    console.error('Passkey register verify error:', error);
    res.status(500).json({ success: false, message: 'Error verifying registration: ' + error.message });
  }
};

// 3. Generate Authentication Options
exports.loginOptions = async (req, res) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
    });

    // Store challenge server-side; return opaque token to client
    const challengeToken = saveChallenge(options.challenge);

    res.json({ ...options, challengeToken });
  } catch (error) {
    console.error('Passkey login options error:', error);
    res.status(500).json({ success: false, message: 'Error generating authentication options: ' + error.message });
  }
};

// 4. Verify Authentication Response (Passwordless Login)
exports.loginVerify = async (req, res) => {
  try {
    // Client echoes back the challengeToken it received from loginOptions
    const { challengeToken, ...credential } = req.body;
    const expectedChallenge = consumeChallenge(challengeToken);
    if (!expectedChallenge) {
      return res.status(400).json({ success: false, message: 'Authentication challenge missing or expired' });
    }

    const { id } = credential; // credentialID as Base64URLString from client

    const user = await User.findOne({ 'passkeys.credentialID': id });
    if (!user) {
      return res.status(400).json({ success: false, message: 'No user registered with this passkey' });
    }

    // TEMPORARY: Restrict login to Administrators only
    if (user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Login is temporarily restricted to Administrators only.' });
    }

    const passkey = user.passkeys.find(p => p.credentialID === id);

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false, // matches userVerification: 'preferred' in generateAuthenticationOptions
      // v13: WebAuthnCredential — id is Base64URLString, publicKey is Uint8Array
      credential: {
        id: passkey.credentialID, // Base64URLString
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

      return sendTokens(res, user, 200);
    }

    res.status(400).json({ success: false, message: 'Passkey authentication failed' });
  } catch (error) {
    console.error('Passkey login verify error:', error);
    res.status(500).json({ success: false, message: 'Error verifying passkey authentication: ' + error.message });
  }
};

// 5. List registered passkeys for the current user (safe metadata only)
exports.listPasskeys = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('passkeys');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const passkeys = user.passkeys.map((p, idx) => ({
      credentialID: p.credentialID,
      shortId: p.credentialID.slice(0, 12) + '\u2026',
      counter: p.counter,
      transports: p.transports || [],
      createdAt: p.createdAt || null,
      index: idx + 1,
    }));

    res.json({ success: true, passkeys });
  } catch (error) {
    console.error('List passkeys error:', error);
    res.status(500).json({ success: false, message: 'Error listing passkeys' });
  }
};

// 6. Delete a specific passkey by credentialID
exports.deletePasskey = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { credentialId } = req.params;
    const before = user.passkeys.length;
    user.passkeys = user.passkeys.filter(p => p.credentialID !== credentialId);

    if (user.passkeys.length === before) {
      return res.status(404).json({ success: false, message: 'Passkey not found' });
    }

    await user.save();
    res.json({ success: true, message: 'Passkey removed successfully' });
  } catch (error) {
    console.error('Delete passkey error:', error);
    res.status(500).json({ success: false, message: 'Error deleting passkey' });
  }
};
