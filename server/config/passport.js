const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Configure Google OAuth Strategy
const googleClientId = process.env.GOOGLE_CLIENT_ID || 'placeholder_client_id';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || 'placeholder_client_secret';
const callbackURL = process.env.CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

if (googleClientId && googleClientId !== 'placeholder_client_id') {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: callbackURL,
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          // Find or create user
          let user = await User.findOne({ email });

          if (!user) {
            console.warn(`OAuth blocked for unregistered email: ${email}`);
            return done(null, false, { message: 'Access Denied: Account not registered.' });
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('Using dummy Google OAuth strategy because GOOGLE_CLIENT_ID was not provided.');
  passport.use(
    new GoogleStrategy(
      {
        clientID: 'dummy_client_id_needs_configuration',
        clientSecret: 'dummy_client_secret',
        callbackURL: callbackURL,
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, false);
      }
    )
  );
}

// Configure Microsoft OAuth Strategy
const msClientId = process.env.MICROSOFT_CLIENT_ID || 'placeholder_ms_client_id';
const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET || 'placeholder_ms_client_secret';
if (msClientId && msClientId !== 'placeholder_ms_client_id') {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: msClientId,
        clientSecret: msClientSecret,
        callbackURL: 'http://localhost:5000/api/auth/microsoft/callback',
        scope: ['user.read'],
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : profile.userPrincipalName;
          let user = await User.findOne({ email });
          if (!user) {
            console.warn(`OAuth blocked for unregistered email: ${email}`);
            return done(null, false, { message: 'Access Denied: Account not registered.' });
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('Using dummy Microsoft OAuth strategy');
  passport.use(new MicrosoftStrategy({ clientID: 'dummy', clientSecret: 'dummy', callbackURL: 'http://localhost:5000/api/auth/microsoft/callback' }, (a, r, p, d) => d(null, false)));
}

// Configure GitHub OAuth Strategy
const ghClientId = process.env.GITHUB_CLIENT_ID || 'placeholder_gh_client_id';
const ghClientSecret = process.env.GITHUB_CLIENT_SECRET || 'placeholder_gh_client_secret';
if (ghClientId && ghClientId !== 'placeholder_gh_client_id') {
  passport.use(
    new GitHubStrategy(
      {
        clientID: ghClientId,
        clientSecret: ghClientSecret,
        callbackURL: 'http://localhost:5000/api/auth/github/callback',
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : `${profile.username}@github.com`;
          let user = await User.findOne({ email });
          if (!user) {
            console.warn(`OAuth blocked for unregistered email: ${email}`);
            return done(null, false, { message: 'Access Denied: Account not registered.' });
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('Using dummy GitHub OAuth strategy');
  passport.use(new GitHubStrategy({ clientID: 'dummy', clientSecret: 'dummy', callbackURL: 'http://localhost:5000/api/auth/github/callback' }, (a, r, p, d) => d(null, false)));
}

module.exports = passport;
