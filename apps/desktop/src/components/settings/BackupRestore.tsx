import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import styles from './BackupRestore.module.css';

interface BackupMetadata {
  created_at: string;
  schema_version: number;
  app_version: string;
  size_bytes: number;
  checksum: string;
  description?: string;
  encrypted: boolean;
}

interface Backup {
  id: string;
  metadata: BackupMetadata;
}

interface BackupRestoreProps {
  onBackupComplete?: () => void;
  onRestoreComplete?: () => void;
}

const BackupRestore: React.FC<BackupRestoreProps> = ({
  onBackupComplete,
  onRestoreComplete,
}) => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [description, setDescription] = useState('');
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'restore' | 'delete' | null>(null);
  // Freeze backup ID during confirmation to prevent TOCTOU race conditions
  const [confirmedBackupId, setConfirmedBackupId] = useState<string | null>(null);

  // Load backups on component mount
  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const backupList = await invoke<Array<[string, BackupMetadata]>>('list_backups_cmd');
      const formattedBackups = backupList.map(([id, metadata]) => ({
        id,
        metadata,
      }));
      setBackups(formattedBackups.sort((a, b) =>
        new Date(b.metadata.created_at).getTime() - new Date(a.metadata.created_at).getTime()
      ));
      setMessage('Backups loaded successfully');
      setMessageType('success');
    } catch (error) {
      setMessage(`Error loading backups: ${String(error)}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    // Description is optional per the UI - don't force users to provide it
    try {
      setLoading(true);
      const backupId = await invoke<string>('create_backup_cmd', {
        description: description.trim() || null,
      });
      // Don't expose full backup ID for security - only show shortened version
      const shortId = backupId?.slice(0, 12) || '';
      setMessage(shortId ? `Backup created successfully (ID: ${shortId}...)` : 'Backup created successfully');
      setMessageType('success');
      setDescription('');
      await loadBackups();
      onBackupComplete?.();
    } catch (error) {
      setMessage('Failed to create backup');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    // Use the frozen backup ID to prevent TOCTOU race conditions
    const targetId = confirmedBackupId;
    if (!targetId) {
      setMessage('No backup selected for restore');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      await invoke('restore_backup_cmd', { backup_id: targetId });
      setMessage('Backup restored successfully');
      setMessageType('success');
      setShowConfirm(false);
      setConfirmAction(null);
      setConfirmedBackupId(null);
      await loadBackups();
      onRestoreComplete?.();
    } catch (error) {
      setMessage('Failed to restore backup');
      setMessageType('error');
      setShowConfirm(false);
      setConfirmedBackupId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async () => {
    // Use the frozen backup ID to prevent TOCTOU race conditions
    const targetId = confirmedBackupId;
    if (!targetId) {
      setMessage('No backup selected for deletion');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      await invoke('delete_backup_cmd', { backup_id: targetId });
      setMessage('Backup deleted successfully');
      setMessageType('success');
      if (selectedBackupId === targetId) {
        setSelectedBackupId(null);
      }
      setShowConfirm(false);
      setConfirmAction(null);
      setConfirmedBackupId(null);
      await loadBackups();
    } catch (error) {
      setMessage('Failed to delete backup');
      setMessageType('error');
      setShowConfirm(false);
      setConfirmedBackupId(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle confirmation - this function name doesn't shadow the state variable
  const handleConfirmAction = () => {
    if (confirmAction === 'restore') {
      handleRestoreBackup();
    } else if (confirmAction === 'delete') {
      handleDeleteBackup();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={styles.container}>
      <h2>Backup & Restore</h2>

      {message && (
        <div className={`${styles.message} ${styles[messageType]}`}>
          <p>{message}</p>
        </div>
      )}

      <section className={styles.section}>
        <h3>Create Backup</h3>
        <p className={styles.description}>
          Create an encrypted backup of your vault. Backups are stored locally and encrypted with your vault key.
        </p>

        <div className={styles.formGroup}>
          <label htmlFor="description">Backup Description (optional)</label>
          <input
            id="description"
            type="text"
            placeholder="e.g., Before major migration"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            className={styles.input}
          />
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={loading}
          className={styles.primaryButton}
        >
          {loading ? 'Creating backup...' : 'Create Backup Now'}
        </button>
      </section>

      <section className={styles.section}>
        <h3>Existing Backups</h3>
        {backups.length === 0 ? (
          <p className={styles.emptyState}>No backups found. Create your first backup above.</p>
        ) : (
          <div className={styles.backupList}>
            {backups.map((backup) => (
              <div
                key={backup.id}
                className={`${styles.backupItem} ${selectedBackupId === backup.id ? styles.selected : ''}`}
                onClick={() => setSelectedBackupId(backup.id)}
              >
                <div className={styles.backupHeader}>
                  <h4>
                    {backup.metadata.description || 'Backup'}
                    {backup.metadata.encrypted && <span className={styles.encrypted}>🔒</span>}
                  </h4>
                  <span className={styles.date}>{formatDate(backup.metadata.created_at)}</span>
                </div>
                <div className={styles.backupDetails}>
                  <span className={styles.detail}>
                    Size: <strong>{formatBytes(backup.metadata.size_bytes)}</strong>
                  </span>
                  <span className={styles.detail}>
                    App v<strong>{backup.metadata.app_version}</strong>
                  </span>
                  <span className={styles.detail}>
                    Schema v<strong>{backup.metadata.schema_version}</strong>
                  </span>
                </div>
                <div className={styles.backupId}>
                  <code>{backup.id.substring(0, 12)}...</code>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedBackupId && (
          <div className={styles.actions}>
            <button
              onClick={() => {
                // Freeze the selected backup ID to prevent TOCTOU race conditions
                setConfirmedBackupId(selectedBackupId);
                setConfirmAction('restore');
                setShowConfirm(true);
              }}
              disabled={loading || !selectedBackupId}
              className={styles.successButton}
            >
              Restore Selected Backup
            </button>
            <button
              onClick={() => {
                // Freeze the selected backup ID to prevent TOCTOU race conditions
                setConfirmedBackupId(selectedBackupId);
                setConfirmAction('delete');
                setShowConfirm(true);
              }}
              disabled={loading || !selectedBackupId}
              className={styles.dangerButton}
            >
              Delete Selected Backup
            </button>
          </div>
        )}
      </section>

      {showConfirm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Confirm Action</h3>
            {confirmAction === 'restore' && (
              <p>
                This will restore your vault from the selected backup. Current data will be overwritten.
                This action cannot be undone.
              </p>
            )}
            {confirmAction === 'delete' && (
              <p>
                This will permanently delete the selected backup. This action cannot be undone.
              </p>
            )}
            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmAction(null);
                  setConfirmedBackupId(null);
                }}
                disabled={loading}
                className={styles.secondaryButton}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={loading}
                className={confirmAction === 'delete' ? styles.dangerButton : styles.successButton}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupRestore;
