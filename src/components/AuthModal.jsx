
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { authApi } from '../api';

export default function AuthModal({
  isOpen,
  onClose,
  initialView = 'login',
  onAuthSuccess,
  onShowToast,
}) {
  const [view, setView] = useState(initialView);

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Registration
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] =
    useState(false);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');

  // Reset password
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialView]);

  const resetFeedback = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const switchView = (newView) => {
    resetFeedback();
    setView(newView);
  };

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const isPasswordSecure = (password) =>
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password);

  // Extract readable errors from FastAPI/Axios.
  const getErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          const field = Array.isArray(item.loc)
            ? item.loc.slice(1).join('.')
            : 'field';

          return `${field}: ${item.msg || 'Invalid value'}`;
        })
        .join(', ');
    }

    if (typeof detail === 'string') {
      return detail;
    }

    if (typeof err?.userMessage === 'string' && err.userMessage) {
      return err.userMessage;
    }

    if (typeof err?.response?.data?.message === 'string') {
      return err.response.data.message;
    }

    if (!err?.response) {
      return 'Cannot connect to the server. Check that the backend is running and CORS is configured.';
    }

    return fallback;
  };

  // Shared API error handler.
  const handleApiError = (err, label, fallback) => {
    console.error(`${label}:`, err?.response?.data || err);

    setErrorMsg(getErrorMessage(err, fallback));
  };

  // LOGIN
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    resetFeedback();

    const email = loginEmail.trim().toLowerCase();

    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!loginPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const data = await authApi.login({
        email,
        password: loginPassword,
        remember_me: rememberMe,
      });

      if (!data || !data.user) {
        throw new Error(
          'The server response does not contain user information. Check the login API response.'
        );
      }

      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
      }

      const userName =
        data.user.name || data.user.full_name || 'User';

      onAuthSuccess?.(data.user);
      onShowToast?.(`Welcome back, ${userName}!`);
      onClose?.();
    } catch (err) {
      handleApiError(
        err,
        'Login error',
        'Login failed. Please check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  // REGISTER
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    resetFeedback();

    const name = regFullName.trim();
    const email = regEmail.trim().toLowerCase();

    if (name.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!isPasswordSecure(regPassword)) {
      setErrorMsg(
        'Password must contain at least 8 characters, including uppercase and lowercase letters and a number.'
      );
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (!termsAccepted) {
      setErrorMsg('Please accept the Terms & Conditions to continue.');
      return;
    }

    setLoading(true);

    try {
      // Matches the current FastAPI RegisterRequest:
      // name, email, password.
      //
      // Phone is optional in this UI but is not sent because
      // the provided backend schema does not include a phone field.
      const data = await authApi.register({
        name,
        email,
        password: regPassword,
      });

      if (!data || !data.user) {
        throw new Error(
          'The server response does not contain user information. Check the registration API response.'
        );
      }

      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
      }

      const userName =
        data.user.name || data.user.full_name || name;

      setSuccessMsg('Account created successfully!');

      onAuthSuccess?.(data.user);
      onShowToast?.(`Welcome to Glow & Glam, ${userName}!`);

      // Close the modal after showing the success message.
      window.setTimeout(() => {
        onClose?.();
      }, 1200);
    } catch (err) {
      handleApiError(
        err,
        'Registration error',
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // FORGOT PASSWORD
  const handleForgotSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    resetFeedback();

    const email = forgotEmail.trim().toLowerCase();

    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      // Backend expects { email: string } — send as an object.
      const data = await authApi.forgotPassword({ email });

      setSuccessMsg(
        data?.message ||
          'If the account exists, password reset instructions will be sent.'
      );
    } catch (err) {
      handleApiError(
        err,
        'Forgot password error',
        'Unable to process your request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // RESET PASSWORD
  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    resetFeedback();

    if (!resetToken.trim()) {
      setErrorMsg('Please enter your password reset token.');
      return;
    }

    if (!isPasswordSecure(newPassword)) {
      setErrorMsg(
        'Password must contain at least 8 characters, including uppercase and lowercase letters and a number.'
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const data = await authApi.resetPassword({
        token: resetToken.trim(),
        new_password: newPassword,
        confirm_password: confirmNewPassword,
      });

      setSuccessMsg(data?.message || 'Password reset successfully.');

      window.setTimeout(() => {
        switchView('login');
        setResetToken('');
        setNewPassword('');
        setConfirmNewPassword('');
      }, 1500);
    } catch (err) {
      handleApiError(
        err,
        'Reset password error',
        'Failed to reset your password. Check the token and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="auth-overlay"
      onClick={() => {
        if (!loading) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Customer Authentication"
    >
      <motion.div
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25 }}
      >
        <button
          type="button"
          className="auth-close-btn"
          onClick={() => !loading && onClose?.()}
          disabled={loading}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Branding */}
        <div className="auth-brand-header">
          <span className="auth-brand-tag">GLOW & GLAM</span>

          <h2>
            {view === 'login' && 'Welcome Back'}
            {view === 'register' && 'Create Your Account'}
            {view === 'forgot' && 'Reset Password'}
            {view === 'reset' && 'Set New Password'}
          </h2>

          <p>
            {view === 'login' &&
              'Sign in to access your wishlist, saved orders, and profile.'}
            {view === 'register' &&
              'Join Glow & Glam for personalized style recommendations and exclusive drops.'}
            {view === 'forgot' &&
              "Enter your registered email and we'll send you password reset instructions."}
            {view === 'reset' &&
              'Enter your reset token and your new password.'}
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="auth-alert auth-alert-error" role="alert">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success message */}
        {successMsg && (
          <div className="auth-alert auth-alert-success" role="status">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {view === 'login' && (
          <form
            className="auth-form"
            onSubmit={handleLoginSubmit}
            noValidate
          >
            <div className="auth-field">
              <label htmlFor="login-email">Email Address</label>

              <div className="auth-input-wrap">
                <Mail size={17} className="auth-field-icon" />

                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="login-password">Password</label>

                <button
                  type="button"
                  className="auth-text-link"
                  onClick={() => switchView('forgot')}
                >
                  Forgot password?
                </button>
              </div>

              <div className="auth-input-wrap">
                <Lock size={17} className="auth-field-icon" />

                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="auth-show-btn"
                  onClick={() =>
                    setShowLoginPassword((previous) => !previous)
                  }
                  aria-label={
                    showLoginPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showLoginPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="auth-options-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me for 14 days</span>
              </label>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              className="admin-cancel-btn"
              style={{
                width: '100%',
                marginTop: '10px',
                fontSize: '12px',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: '#fff6f2',
                color: '#9c5e4a',
                border: '1px dashed #e8dbd5',
              }}
              onClick={() => {
                setLoginEmail('admin@glowandglam.com');
                setLoginPassword('Admin@Glow2026');
                setErrorMsg('');
              }}
            >
              <ShieldCheck size={14} /> Fill Admin Login (admin@glowandglam.com)
            </button>

            <div className="auth-footer-switch">
              <span>Don't have an account?</span>

              <button
                type="button"
                onClick={() => switchView('register')}
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {view === 'register' && (
          <form
            className="auth-form"
            onSubmit={handleRegisterSubmit}
            noValidate
          >
            <div className="auth-field">
              <label htmlFor="reg-name">Full Name</label>

              <div className="auth-input-wrap">
                <User size={17} className="auth-field-icon" />

                <input
                  id="reg-name"
                  type="text"
                  placeholder="Your Name"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">Email Address</label>

              <div className="auth-input-wrap">
                <Mail size={17} className="auth-field-icon" />

                <input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-phone">Phone Number (Optional)</label>

              <div className="auth-input-wrap">
                <Phone size={17} className="auth-field-icon" />

                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">Password</label>

              <div className="auth-input-wrap">
                <Lock size={17} className="auth-field-icon" />

                <input
                  id="reg-password"
                  type={showRegPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="auth-show-btn"
                  onClick={() =>
                    setShowRegPassword((previous) => !previous)
                  }
                  aria-label={
                    showRegPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showRegPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-confirm">Confirm Password</label>

              <div className="auth-input-wrap">
                <Lock size={17} className="auth-field-icon" />

                <input
                  id="reg-confirm"
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="auth-show-btn"
                  onClick={() =>
                    setShowRegConfirmPassword((previous) => !previous)
                  }
                  aria-label={
                    showRegConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showRegConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="auth-options-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  required
                />

                <span>
                  I agree to the{' '}
                  <a
                    href="#footer"
                    onClick={(e) => e.preventDefault()}
                  >
                    Terms &amp; Conditions
                  </a>{' '}
                  and{' '}
                  <a
                    href="#footer"
                    onClick={(e) => e.preventDefault()}
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="auth-footer-switch">
              <span>Already have an account?</span>

              <button
                type="button"
                onClick={() => switchView('login')}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {view === 'forgot' && (
          <form
            className="auth-form"
            onSubmit={handleForgotSubmit}
            noValidate
          >
            <div className="auth-field">
              <label htmlFor="forgot-email">
                Registered Email Address
              </label>

              <div className="auth-input-wrap">
                <Mail size={17} className="auth-field-icon" />

                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            <div className="auth-footer-switch">
              <span>Remembered your password?</span>

              <button
                type="button"
                onClick={() => switchView('login')}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD FORM */}
        {view === 'reset' && (
          <form
            className="auth-form"
            onSubmit={handleResetSubmit}
            noValidate
          >
            <div className="auth-field">
              <label htmlFor="reset-token">Reset Token</label>

              <div className="auth-input-wrap">
                <input
                  id="reset-token"
                  type="text"
                  placeholder="Paste token from email or URL"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="new-password">New Password</label>

              <div className="auth-input-wrap">
                <Lock size={17} className="auth-field-icon" />

                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="auth-show-btn"
                  onClick={() =>
                    setShowNewPassword((previous) => !previous)
                  }
                  aria-label={
                    showNewPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showNewPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="confirm-new-password">
                Confirm New Password
              </label>

              <div className="auth-input-wrap">
                <Lock size={17} className="auth-field-icon" />

                <input
                  id="confirm-new-password"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChange={(e) =>
                    setConfirmNewPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>

            <div className="auth-footer-switch">
              <button
                type="button"
                onClick={() => switchView('login')}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
