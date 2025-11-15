import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Button, Card, Select, Group, TextInput } from '@mantine/core';
import { logger } from '../utils/logger';

interface AdvancedImportProperties {
  spaceId: string;
}

const AdvancedImport: React.FC<AdvancedImportProperties> = ({ spaceId }) => {
  const [importFormat, setImportFormat] = useState<string | null>('obsidian');
  const [path, setPath] = useState<string>('');

  const handleImport = async () => {
    if (!path || !importFormat) {
      return;
    }

    try {
      if (importFormat === 'obsidian') {
        await invoke('import_from_obsidian_cmd', { spaceId, path });
      } else if (importFormat === 'notion') {
        await invoke('import_from_notion_cmd', { spaceId, path });
      }
      // Optionally, show a success notification
    } catch (error) {
      logger.error('Error importing:', error as Error);
    }
  };

  return (
    <div>
      <h2>Advanced Import</h2>
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Select
          label="Import from"
          data={[
            { value: 'obsidian', label: 'Obsidian' },
            { value: 'notion', label: 'Notion' },
          ]}
          value={importFormat}
          onChange={setImportFormat}
        />
        <TextInput
          label="Path"
          placeholder="Enter absolute path to vault/export directory"
          value={path}
          onChange={(e) => setPath(e.currentTarget.value)}
          mt="md"
        />
        <Group justify="right" mt="md">
          <Button onClick={handleImport}>Import</Button>
        </Group>
      </Card>
    </div>
  );
};

export default AdvancedImport;
