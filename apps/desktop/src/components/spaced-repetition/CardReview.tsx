import React, { useState } from 'react';
import { Card, Text, Button, Group, Stack, Badge } from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { KnowledgeCard, ReviewRating, ratingColors, ratingLabels } from './types';

interface CardReviewProps {
  card: KnowledgeCard;
  onRate: (rating: ReviewRating) => void;
  isLoading?: boolean;
}

/**
 * Card Review Component - Shows a flashcard for review
 */
export const CardReview: React.FC<CardReviewProps> = ({ card, onRate, isLoading = false }) => {
  const [showAnswer, setShowAnswer] = useState(false);

  const handleRate = (rating: ReviewRating) => {
    onRate(rating);
    setShowAnswer(false);
  };

  return (
    <Stack gap="lg">
      {/* Card Front */}
      <Card withBorder p="xl" shadow="sm">
        <Stack align="center" gap="md">
          <Badge size="sm" variant="light">
            {card.deck}
          </Badge>
          <Text size="xl" fw={500} ta="center">
            {card.front}
          </Text>
        </Stack>
      </Card>

      {/* Answer Section */}
      {showAnswer ? (
        <>
          <Card withBorder p="xl" bg="gray.0">
            <Text size="lg" ta="center">
              {card.back}
            </Text>
          </Card>

          {/* Rating Buttons */}
          <Group justify="center" gap="md">
            {(['again', 'hard', 'good', 'easy'] as ReviewRating[]).map((rating) => (
              <Button
                key={rating}

                color={ratingColors[rating]}
                onClick={() => handleRate(rating)}
                loading={isLoading}
                size="lg"
              >
                { }
                {ratingLabels[rating]}
              </Button>
            ))}
          </Group>
        </>
      ) : (
        <Button leftSection={<IconEye size={16} />} onClick={() => setShowAnswer(true)} size="lg" fullWidth>
          Show Answer
        </Button>
      )}

      {/* Card Stats */}
      <Group justify="center" gap="xl">
        <Text size="sm" c="dimmed">
          Interval: {card.interval} days
        </Text>
        <Text size="sm" c="dimmed">
          Ease: {(card.ease_factor * 100).toFixed(0)}%
        </Text>
        <Text size="sm" c="dimmed">
          Reviews: {card.repetitions}
        </Text>
      </Group>
    </Stack>
  );
};
