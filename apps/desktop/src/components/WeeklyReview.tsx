import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Button, Card, Text, Loader, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { logger } from '../utils/logger';

interface Note {
  id: string;
  space_id: string;
  title: string;
  content_md: string;
  created_at: number;
  modified_at: number;
  is_trashed: boolean;
}

interface WeeklyReviewProperties {
  spaceId: string;
}

const WeeklyReview: React.FC<WeeklyReviewProperties> = ({ spaceId }) => {
  const [reviewNote, setReviewNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const note: Note = await invoke('generate_weekly_review_cmd', { spaceId });
      setReviewNote(note);
    } catch (error_) {
      setError('Failed to generate weekly review. Please try again later.');
      logger.error('Failed to generate weekly review:', error_ as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Weekly Review</h2>
      <Button onClick={handleGenerateReview} disabled={loading}>
        {loading ? <Loader size="sm" /> : 'Generate Weekly Review'}
      </Button>

      {error && (
        <Alert icon={<IconInfoCircle size={16} />} title="Error" color="red" mt="md">
          {error}
        </Alert>
      )}

      {reviewNote && (
        <Card shadow="sm" p="lg" radius="md" withBorder mt="md">
          <Text fw={500}>{reviewNote.title}</Text>
          <Text style={{ whiteSpace: 'pre-wrap' }} mt="md">
            {reviewNote.content_md}
          </Text>
        </Card>
      )}
    </div>
  );
};

export default WeeklyReview;
