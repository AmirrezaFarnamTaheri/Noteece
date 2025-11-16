import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Card, Switch, Group, Text } from '@mantine/core';
import { logger } from '../utils/logger';

interface Mode {
  id: string;
  name: string;
}

const availableModes: Mode[] = [
  { id: 'meeting-notes', name: 'Meeting Notes' },
  { id: 'project-hub', name: 'Project Hub' },
  { id: 'srs', name: 'Spaced Repetition' },
];

interface ModeStoreProperties {
  spaceId: string;
}

const ModeStore: React.FC<ModeStoreProperties> = ({ spaceId }) => {
  const [enabledModes, setEnabledModes] = useState<Mode[]>([]);

  const fetchEnabledModes = async () => {
    try {
      const modes: Mode[] = await invoke('get_space_modes_cmd', { spaceId });
      setEnabledModes(modes);
    } catch (error) {
      logger.error('Error fetching enabled modes:', error as Error);
    }
  };

  useEffect(() => {
    if (spaceId) {
      void fetchEnabledModes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  const isModeEnabled = (mode: Mode) => {
    return enabledModes.some((enabledMode) => enabledMode.id === mode.id);
  };

  const handleToggleMode = async (mode: Mode) => {
    try {
      await (isModeEnabled(mode)
        ? invoke('disable_mode_cmd', { spaceId, mode })
        : invoke('enable_mode_cmd', { spaceId, mode }));
      void fetchEnabledModes();
    } catch (error) {
      logger.error('Error toggling mode:', error as Error);
    }
  };

  return (
    <div>
      <h2>Mode Store</h2>
      <Card shadow="sm" p="lg" radius="md" withBorder>
        {availableModes.map((mode) => (
          <Group justify="apart" key={mode.id} mt="sm">
            <Text>{mode.name}</Text>
            <Switch checked={isModeEnabled(mode)} onChange={() => handleToggleMode(mode)} />
          </Group>
        ))}
      </Card>
    </div>
  );
};

export default ModeStore;
