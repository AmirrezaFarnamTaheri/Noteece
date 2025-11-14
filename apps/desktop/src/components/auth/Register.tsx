import React, { useState } from 'react';
import { authService } from '../../services/auth';
import styles from './Auth.module.css';

interface RegisterProperties {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProperties> = ({ onSuccess, onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }

    if (!email.trim()) {
      setError('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!password) {
      setError('Password is required');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await authService.register(username, email, password);

      // Auto-login after registration
      await authService.login(username, password);

      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (() => {
    if (!password) return 'weak';
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^\dA-Za-z]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength === 3) return 'medium';
    return 'strong';
  })();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Join Noteece</h1>
          <p>Create your account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              disabled={loading}
              className={styles.input}
              autoComplete="username"
            />
            {username && username.length < 3 && <span className={styles.hint}>At least 3 characters required</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              className={styles.input}
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <div className={styles.passwordField}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                disabled={loading}
                className={styles.input}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.togglePassword}
                disabled={loading}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {password && (
              <div className={`${styles.strengthMeter} ${styles[passwordStrength]}`}>
                <div className={styles.strengthLabel}>
                  Strength: <strong>{passwordStrength.toUpperCase()}</strong>
                </div>
                <div className={styles.strengthBar}>
                  <div className={styles.fill} />
                </div>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className={styles.passwordField}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                disabled={loading}
                className={styles.input}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={styles.togglePassword}
                disabled={loading}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {password && confirmPassword && password === confirmPassword && (
              <span className={styles.success}>Passwords match ✓</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !email.trim() || !password || !confirmPassword}
            className={styles.primaryButton}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className={styles.divider}>or</div>

        <p className={styles.switchText}>
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className={styles.switchLink} disabled={loading}>
            Sign in
          </button>
        </p>
      </div>

      <div className={styles.features}>
        <h3>Why join Noteece?</h3>
        <ul>
          <li>✨ Privacy-first by design</li>
          <li>🔐 Military-grade encryption</li>
          <li>📈 Powerful analytics tools</li>
          <li>🌐 18 integrated social platforms</li>
        </ul>
      </div>
    </div>
  );
};

export default Register;
