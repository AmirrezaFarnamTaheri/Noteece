import React from 'react';
import styles from './SessionWarningModal.module.css';

interface SessionWarningModalProperties {
  show: boolean;
  minutesLeft: number;
  onDismiss: () => void;
  onLogout: () => void;
}

const SessionWarningModal: React.FC<SessionWarningModalProperties> = ({ show, minutesLeft, onDismiss, onLogout }) => {
  if (!show) {
    return null;
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <div className={styles.icon}>⏰</div>
          <h2>Session Expiring Soon</h2>
        </div>

        <div className={styles.body}>
          <p>
            Your session will expire in{' '}
            <strong>
              {minutesLeft} minute{minutesLeft === 1 ? '' : 's'}
            </strong>
            .
          </p>
          <p className={styles.hint}>
            You will be automatically logged out for security purposes. Continue working or logout manually.
          </p>
        </div>

        <div className={styles.actions}>
          <button onClick={onDismiss} className={styles.continueButton}>
            Continue Working
          </button>
          <button onClick={onLogout} className={styles.logoutButton}>
            Logout Now
          </button>
        </div>

        <div className={styles.footer}>
          <p>Sessions automatically expire after 24 hours of inactivity to protect your account.</p>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;
