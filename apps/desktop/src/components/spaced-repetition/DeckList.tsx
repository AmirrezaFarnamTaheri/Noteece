import React from 'react';
import { Card, Text, Group, Stack, Badge, Progress, Button } from '@mantine/core';
import { IconCards, IconPlay } from '@tabler/icons-react';
import { DeckStats } from './types';

interface DeckListProps {
  decks: DeckStats[];
  onStartReview: (deck: string) => void;
}

/**
 * Deck List Component - Shows all decks with their stats
 */
export const DeckList: React.FC<DeckListProps> = ({ decks, onStartReview }) => {
  if (decks.length === 0) {
    return (
      <Card withBorder p="xl">
        <Stack align="center" gap="md">
          <IconCards size={48} opacity={0.5} />
          <Text c="dimmed">No decks created yet</Text>
          <Text size="sm" c="dimmed">
            Create cards to start studying
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      {decks.map((deck) => {
        const progressValue = deck.total > 0
          ? ((deck.total - deck.due) / deck.total) * 100
          : 0;

        return (
          <Card key={deck.deck} withBorder p="md">
            <Group justify="space-between" wrap="nowrap">
              <div style={{ flex: 1 }}>
                <Group gap="sm" mb="xs">
                  <Text fw={500}>{deck.deck}</Text>
                  <Badge size="xs" variant="light">
                    {deck.total} cards
                  </Badge>
                </Group>

                <Progress
                  value={progressValue}
                  size="sm"
                  radius="xl"
                  mb="xs"
                />

                <Group gap="lg">
                  <Text size="xs" c="blue">
                    New: {deck.new}
                  </Text>
                  <Text size="xs" c="orange">
                    Learning: {deck.learning}
                  </Text>
                  <Text size="xs" c="green">
                    Review: {deck.review}
                  </Text>
                  <Text size="xs" c="red" fw={500}>
                    Due: {deck.due}
                  </Text>
                </Group>
              </div>

              <Button
                leftSection={<IconPlay size={16} />}
                onClick={() => onStartReview(deck.deck)}
                disabled={deck.due === 0}
              >
                Study
              </Button>
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
};

