import React, { useState } from 'react';
import { Modal, Textarea, Button, Group, Stack, Select } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

interface CreateCardModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (front: string, back: string, deck: string) => void;
  isLoading?: boolean;
  decks?: string[];
}

/**
 * Create Card Modal - Add new flashcards
 */
export const CreateCardModal: React.FC<CreateCardModalProps> = ({
  opened,
  onClose,
  onSubmit,
  isLoading = false,
  decks = ['Default'],
}) => {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [deck, setDeck] = useState(decks[0] || 'Default');

  const handleSubmit = () => {
    if (front.trim() && back.trim()) {
      onSubmit(front.trim(), back.trim(), deck);
      setFront('');
      setBack('');
    }
  };

  const handleClose = () => {
    setFront('');
    setBack('');
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Create New Card" size="lg">
      <Stack gap="md">
        <Select
          label="Deck"
          value={deck}
          onChange={(v) => setDeck(v || 'Default')}
          data={decks.map((d) => ({ value: d, label: d }))}
          searchable
          creatable
          getCreateLabel={(query) => `+ Create "${query}"`}
          onCreate={(query) => {
            setDeck(query);
            return query;
          }}
        />

        <Textarea
          label="Front (Question)"
          placeholder="Enter the question or prompt..."
          value={front}
          onChange={(e) => setFront(e.currentTarget.value)}
          minRows={3}
          required
        />

        <Textarea
          label="Back (Answer)"
          placeholder="Enter the answer..."
          value={back}
          onChange={(e) => setBack(e.currentTarget.value)}
          minRows={3}
          required
        />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleSubmit}
            loading={isLoading}
            disabled={!front.trim() || !back.trim()}
          >
            Create Card
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

