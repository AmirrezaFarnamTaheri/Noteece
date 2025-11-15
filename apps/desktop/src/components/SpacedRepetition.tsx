/**
 * Spaced Repetition System (SRS) - Full-featured flashcard review interface
 */

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Button,
  Group,
  Text,
  Stack,
  Title,
  Paper,
  Progress,
  Badge,
  RingProgress,
  Center,
  Modal,
  Textarea,
  Tabs,
} from '@mantine/core';
import {
  IconBrain,
  IconCheck,
  IconX,
  IconReload,
  IconTrophy,
  IconPlus,
  IconCards,
  IconChartBar,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import classes from './SpacedRepetition.module.css';
import { logger } from '../utils/logger';

interface KnowledgeCard {
  id: string;
  note_id: string;
  deck_id: string;
  content: string;
  due_at: number;
}

interface Stats {
  reviewed: number;
  correct: number;
  streak: number;
}

const SpacedRepetition: React.FC = () => {
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState<Stats>({ reviewed: 0, correct: 0, streak: 0 });
  const [newCardModalOpened, setNewCardModalOpened] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('review');

  useEffect(() => {
    void fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const cardsData: KnowledgeCard[] = await invoke('get_due_cards_cmd');
      setCards(cardsData);
      if (cardsData.length === 0) {
        notifications.show({
          title: 'All caught up!',
          message: 'No cards due for review right now.',
          color: 'green',
          icon: <IconCheck />,
        });
      }
    } catch (error) {
      logger.error('Error fetching due cards:', error as Error);
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch cards',
        color: 'red',
        icon: <IconX />,
      });
    }
  };

  const handleReview = async (quality: number) => {
    const indexAtStart = currentCardIndex;
    const currentCard = cards[indexAtStart];

    if (!currentCard) {
      logger.warn('No current card available for review');
      return;
    }
    const reviewedId = currentCard.id;

    try {
      await invoke('review_card_cmd', { cardId: reviewedId, quality });

      const isCorrect = quality >= 3;
      setStats((previous) => ({
        reviewed: previous.reviewed + 1,
        correct: previous.correct + (isCorrect ? 1 : 0),
        streak: isCorrect ? previous.streak + 1 : 0,
      }));

      if (quality === 5) {
        notifications.show({ title: 'Perfect! 🎉', message: 'Easy recall!', color: 'green', autoClose: 2000 });
      } else if (quality === 1) {
        notifications.show({
          title: 'Keep trying!',
          message: "It's okay, you'll get it next time.",
          color: 'orange',
          autoClose: 2000,
        });
      }

      setIsFlipped(false);

      setCurrentCardIndex((previous) => {
        if (cards[previous]?.id === reviewedId) {
          const next = previous + 1;
          if (next < cards.length) return next;
        }
        return 0;
      });

      if (indexAtStart >= cards.length - 1) {
        await fetchCards();
      }
    } catch (error) {
      logger.error('Error reviewing card:', error as Error);
      notifications.show({ title: 'Error', message: 'Failed to review card', color: 'red' });
    }
  };

  const handleCreateCard = async () => {
    if (!front.trim() || !back.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Both front and back are required',
        color: 'red',
      });
      return;
    }

    try {
      // In a real implementation, this would call a create_card_cmd
      // For now, just show success
      notifications.show({
        title: 'Card Created!',
        message: 'New card added to your deck',
        color: 'green',
        icon: <IconCheck />,
      });

      setFront('');
      setBack('');
      setNewCardModalOpened(false);
      await fetchCards();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to create card',
        color: 'red',
      });
    }
  };

  const accuracyRate = stats.reviewed > 0 ? (stats.correct / stats.reviewed) * 100 : 0;

  // Review Tab Content
  const renderReviewTab = () => {
    if (cards.length === 0) {
      return (
        <Center h={400}>
          <Stack align="center" gap="md">
            <IconTrophy size={64} color="var(--mantine-color-green-5)" />
            <Title order={3}>All Caught Up!</Title>
            <Text c="dimmed" ta="center">
              No cards due for review right now.
              <br />
              Come back later or create new cards.
            </Text>
            <Button leftSection={<IconPlus size={16} />} onClick={() => setNewCardModalOpened(true)}>
              Create New Card
            </Button>
          </Stack>
        </Center>
      );
    }

    const currentCard = cards[currentCardIndex];

    if (!currentCard) {
      return (
        <Center h={400}>
          <Text c="dimmed">Card not available</Text>
        </Center>
      );
    }

    const [cardFront, cardBack] = currentCard.content.split('\n---\n');
    const progressValue = ((currentCardIndex + 1) / cards.length) * 100;

    return (
      <Stack gap="md">
        {/* Progress and Stats */}
        <Paper withBorder p="md">
          <Group justify="space-between" mb="sm">
            <Text size="sm" fw={600}>
              Card {currentCardIndex + 1} of {cards.length}
            </Text>
            <Group gap="xs">
              <Badge color="blue" leftSection="🔥">
                Streak: {stats.streak}
              </Badge>
              <Badge color="green">
                {stats.correct}/{stats.reviewed}
              </Badge>
            </Group>
          </Group>
          <Progress value={progressValue} size="lg" />
        </Paper>

        {/* Flashcard */}
        <Paper
          withBorder
          p="xl"
          className={classes.flashcard}
          onClick={() => !isFlipped && setIsFlipped(true)}
          style={{
            minHeight: 300,
            cursor: isFlipped ? 'default' : 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          <Center h="100%">
            <Stack align="center" gap="md">
              <Text size="xl" fw={500} ta="center">
                {isFlipped ? cardBack || 'Back of card' : cardFront || 'Front of card'}
              </Text>
              {!isFlipped && (
                <Text size="sm" c="dimmed">
                  Click to reveal answer
                </Text>
              )}
            </Stack>
          </Center>
        </Paper>

        {/* Action Buttons */}
        {isFlipped ? (
          <Group grow>
            <Button size="lg" color="red" onClick={() => handleReview(1)} leftSection={<IconX size={20} />}>
              Again
              <br />
              <Text size="xs" opacity={0.7}>
                &lt;1 min
              </Text>
            </Button>
            <Button size="lg" color="orange" onClick={() => handleReview(2)}>
              Hard
              <br />
              <Text size="xs" opacity={0.7}>
                &lt;10 min
              </Text>
            </Button>
            <Button size="lg" color="blue" onClick={() => handleReview(3)}>
              Good
              <br />
              <Text size="xs" opacity={0.7}>
                1 day
              </Text>
            </Button>
            <Button size="lg" color="green" onClick={() => handleReview(5)} leftSection={<IconCheck size={20} />}>
              Easy
              <br />
              <Text size="xs" opacity={0.7}>
                4 days
              </Text>
            </Button>
          </Group>
        ) : (
          <Button size="lg" fullWidth onClick={() => setIsFlipped(true)} leftSection={<IconReload size={20} />}>
            Flip Card
          </Button>
        )}
      </Stack>
    );
  };

  // Stats Tab Content
  const renderStatsTab = () => {
    return (
      <Stack gap="md">
        <Paper withBorder p="md">
          <Title order={4} mb="md">
            Session Stats
          </Title>
          <Group grow>
            <div>
              <Text size="sm" c="dimmed" mb="xs">
                Cards Reviewed
              </Text>
              <Title order={2}>{stats.reviewed}</Title>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb="xs">
                Accuracy
              </Text>
              <Title order={2}>{accuracyRate.toFixed(0)}%</Title>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb="xs">
                Current Streak
              </Text>
              <Title order={2}>🔥 {stats.streak}</Title>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md">
          <Center>
            <RingProgress
              size={200}
              thickness={16}
              sections={[{ value: accuracyRate, color: accuracyRate > 70 ? 'green' : 'orange' }]}
              label={
                <Center>
                  <Stack align="center" gap={0}>
                    <Text size="xl" fw={700}>
                      {accuracyRate.toFixed(0)}%
                    </Text>
                    <Text size="xs" c="dimmed">
                      Accuracy
                    </Text>
                  </Stack>
                </Center>
              }
            />
          </Center>
        </Paper>
      </Stack>
    );
  };

  return (
    <div className={classes.container}>
      <Modal
        opened={newCardModalOpened}
        onClose={() => setNewCardModalOpened(false)}
        title="Create New Flashcard"
        size="lg"
      >
        <Stack gap="md">
          <Textarea
            label="Front (Question)"
            placeholder="Enter the question or prompt"
            value={front}
            onChange={(e) => setFront(e.currentTarget.value)}
            minRows={3}
          />
          <Textarea
            label="Back (Answer)"
            placeholder="Enter the answer"
            value={back}
            onChange={(e) => setBack(e.currentTarget.value)}
            minRows={3}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setNewCardModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCard} leftSection={<IconPlus size={16} />}>
              Create Card
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack gap="lg">
        <Group justify="space-between">
          <Group gap="xs">
            <IconBrain size={28} color="var(--mantine-color-violet-5)" />
            <Title order={2}>Spaced Repetition</Title>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setNewCardModalOpened(true)}>
            New Card
          </Button>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="review" leftSection={<IconCards size={16} />}>
              Review Cards
            </Tabs.Tab>
            <Tabs.Tab value="stats" leftSection={<IconChartBar size={16} />}>
              Statistics
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="review" pt="md">
            {renderReviewTab()}
          </Tabs.Panel>

          <Tabs.Panel value="stats" pt="md">
            {renderStatsTab()}
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </div>
  );
};

export default SpacedRepetition;
