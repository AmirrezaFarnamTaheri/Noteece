import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Mode } from './types';
import { useStore } from '../store';

const availableModes: Mode[] = [
  { id: 'meeting-notes', name: 'Meeting Notes', category: 'productivity' },
  { id: 'project-hub', name: 'Project Hub', category: 'productivity' },
  { id: 'srs', name: 'Spaced Repetition', category: 'learning' },
];

const Settings: React.FC = () => {
  const [path, setPath] = useState('');
  const [password, setPassword] = useState('');
  const [modes, setModes] = useState<Mode[]>([]);
  const [message, setMessage] = useState('');
  const { activeSpaceId } = useStore();

  useEffect(() => {
    const fetchModes = async () => {
      if (!activeSpaceId) return;
      try {
        const spaceModes: Mode[] = await invoke('get_space_modes_cmd', { spaceId: activeSpaceId });
        setModes(spaceModes);
      } catch (error) {
        console.error('Error fetching modes:', error);
      }
    };

    void fetchModes();
  }, [activeSpaceId]);

  const handleCreateVault = async () => {
    try {
      await invoke('create_vault_cmd', { path, password });
      setMessage('Vault created successfully');
    } catch (error) {
      setMessage(`Error creating vault: ${String(error)}`);
    }
  };

  const handleUnlockVault = async () => {
    try {
      await invoke('unlock_vault_cmd', { path, password });
      setMessage('Vault unlocked successfully');
    } catch (error) {
      setMessage(`Error unlocking vault: ${String(error)}`);
    }
  };

  const isModeEnabled = (mode: Mode) => {
    return modes.some((enabledMode) => enabledMode.id === mode.id);
  };

  const handleToggleMode = async (mode: Mode) => {
    if (!activeSpaceId) return;
    try {
      await (isModeEnabled(mode)
        ? invoke('disable_mode_cmd', { spaceId: activeSpaceId, mode })
        : invoke('enable_mode_cmd', { spaceId: activeSpaceId, mode }));
      // Refetch modes after toggling
      const spaceModes: Mode[] = await invoke('get_space_modes_cmd', { spaceId: activeSpaceId });
      setModes(spaceModes);
    } catch (error) {
      console.error(`Error toggling mode ${mode.name}:`, error);
    }
  };

  return (
    <div>
      <h2>Settings</h2>

      <h3>Vault Management</h3>
      <input type="text" placeholder="Vault Path" value={path} onChange={(e) => setPath(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleCreateVault}>Create Vault</button>
      <button onClick={handleUnlockVault}>Unlock Vault</button>
      {message && <p>{message}</p>}

      <h3>Mode Management</h3>
      <div>
        {availableModes.map((mode) => (
          <div key={mode.id}>
            <input type="checkbox" id={mode.id} checked={isModeEnabled(mode)} onChange={() => handleToggleMode(mode)} />
            <label htmlFor={mode.id}>{mode.name}</label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Settings;
