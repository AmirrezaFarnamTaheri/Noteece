import React, { useState, useEffect } from 'react';
import { authService, User } from '../../services/auth';
import styles from './Auth.module.css';

interface AccountSettingsProperties {
  onLogout: () => void;
}

const formatDate = (timestamp: number | undefined | null) => {
  if (timestamp == null) return 'Never';
  if (!Number.isFinite(timestamp)) return 'Invalid date';
  const seconds = Math.max(0, timestamp);
  try {
    return new Date(seconds * 1000).toLocaleString();
  } catch {
    return 'Invalid date';
  }
};

const AccountSettings: React.FC<AccountSettingsProperties> = ({ onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Load user info on mount
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!oldPassword) {
      setMessage('Current password is required');
      setMessageType('error');
      return;
    }

    if (!newPassword) {
      setMessage('New password is required');
      setMessageType('error');
      return;
    }

    if (newPassword.length < 8) {
      setMessage('New password must be at least 8 characters');
      setMessageType('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match');
      setMessageType('error');
      return;
    }

    if (oldPassword === newPassword) {
      setMessage('New password must be different from current password');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      await authService.changePassword(oldPassword, newPassword);
      setMessage('Password changed successfully');
      setMessageType('success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to change password');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setMessage('Logged out successfully');
      setMessageType('success');
      setTimeout(() => onLogout(), 1500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Logout failed');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p>Loading user information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Account Settings</h1>
          <p>Manage your Noteece account</p>
        </div>

        { }
        {message && <div className={`${styles.message} ${styles[messageType]}`}>{message}</div>}

        <section className={styles.section}>
          <h3>Profile Information</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <strong>Username</strong>
              <p className={styles.value}>{user.username}</p>
            </div>
            <div className={styles.infoItem}>
              <strong>Email</strong>
              <p className={styles.value}>{user.email}</p>
            </div>
            <div className={styles.infoItem}>
              <strong>Account Created</strong>
              <p className={styles.value}>{formatDate(user.created_at)}</p>
            </div>
            <div className={styles.infoItem}>
              <strong>Last Login</strong>
              <p className={styles.value}>{formatDate(user.last_login_at)}</p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h3>Security</h3>
          {showPasswordChange ? (
            <form onSubmit={handleChangePassword} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="oldPassword">Current Password</label>
                <div className={styles.passwordField}>
                  <input
                    id="oldPassword"
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    disabled={loading}
                    className={styles.input}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className={styles.togglePassword}
                    disabled={loading}
                  >
                    {showOldPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="newPassword">New Password</label>
                <div className={styles.passwordField}>
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    disabled={loading}
                    className={styles.input}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={styles.togglePassword}
                    disabled={loading}
                  >
                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                  className={styles.input}
                  autoComplete="new-password"
                />
              </div>

              <div className={styles.actionGroup}>
                <button
                  type="submit"
                  disabled={loading || !oldPassword || !newPassword || !confirmPassword}
                  className={styles.primaryButton}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={loading}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowPasswordChange(true)} className={styles.secondaryButton} disabled={loading}>
              Change Password
            </button>
          )}
        </section>

        <section className={styles.section}>
          <h3>Session</h3>
          <p className={styles.description}>
            Your session will automatically expire after 24 hours of inactivity for security purposes.
          </p>
          <button onClick={handleLogout} disabled={loading} className={styles.dangerButton}>
            {loading ? 'Logging out...' : 'Logout'}
          </button>
        </section>
      </div>
    </div>
  );
};

export default AccountSettings;
