import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, User, Mail, Phone, ShieldCheck, LogOut, Edit2, Check, Loader2, AlertCircle } from 'lucide-react';
import { authApi } from '../api';

export default function ProfileModal({ isOpen, onClose, user, onUpdateUser, onLogout, onShowToast, onOpenAdmin }) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setIsEditing(false);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg('Full name must be at least 2 characters long.');
      return;
    }

    setLoading(true);
    try {
      const updated = await authApi.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      });

      onUpdateUser?.(updated);
      setIsEditing(false);
      setSuccessMsg('Profile updated successfully!');
      onShowToast?.('Profile updated successfully!');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      onLogout?.();
      onClose();
      onShowToast?.('Logged out successfully.');
    } catch (err) {
      // Even if network error, clear local auth
      onLogout?.();
      onClose();
    }
  };

  // Get initial letters for avatar
  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'GG';

  return (
    <div className="auth-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Customer Profile">
      <motion.div
        className="auth-modal profile-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25 }}
      >
        <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close profile">
          <X size={20} />
        </button>

        {/* Profile Card Header */}
        <div className="profile-header">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-header-meta">
            <h2>{user.full_name}</h2>
            <span className="profile-badge">
              <ShieldCheck size={13} /> {user.role === 'customer' ? 'Verified Customer' : user.role}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="auth-alert auth-alert-error" role="alert">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert auth-alert-success" role="status">
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Profile Details / Edit Form */}
        <form onSubmit={handleSave} className="profile-form">
          <div className="profile-field-group">
            <label>Full Name</label>
            {isEditing ? (
              <div className="auth-input-wrap">
                <User size={17} className="auth-field-icon" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="profile-val-text">
                <User size={16} />
                <span>{user.full_name}</span>
              </div>
            )}
          </div>

          <div className="profile-field-group">
            <label>Email Address</label>
            <div className="profile-val-text profile-disabled">
              <Mail size={16} />
              <span>{user.email}</span>
            </div>
            <small className="field-note">Email address cannot be changed.</small>
          </div>

          <div className="profile-field-group">
            <label>Phone Number</label>
            {isEditing ? (
              <div className="auth-input-wrap">
                <Phone size={17} className="auth-field-icon" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            ) : (
              <div className="profile-val-text">
                <Phone size={16} />
                <span>{user.phone || 'Not provided'}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="profile-btn-row">
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="profile-cancel-btn"
                  onClick={() => {
                    setIsEditing(false);
                    setFullName(user.full_name);
                    setPhone(user.phone || '');
                    setErrorMsg('');
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="auth-submit-btn profile-save-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spinner" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="profile-edit-btn"
                onClick={() => {
                  setIsEditing(true);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              >
                <Edit2 size={15} /> Edit Profile
              </button>
            )}
          </div>
        </form>

        {(user.is_admin || user.role === 'admin') && (
          <div style={{ margin: '0 24px 16px' }}>
            <button
              type="button"
              className="primary-button"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                onClose();
                onOpenAdmin?.();
              }}
            >
              <ShieldCheck size={16} /> Open Admin Dashboard
            </button>
          </div>
        )}

        {/* Footer Logout */}
        <div className="profile-footer">
          <button type="button" className="profile-logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Sign Out of Account
          </button>
        </div>
      </motion.div>
    </div>
  );
}
