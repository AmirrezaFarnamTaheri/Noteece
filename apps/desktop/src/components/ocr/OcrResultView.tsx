import React from 'react';
import { Card, Text, Stack, Group, Badge, Button, Textarea, CopyButton } from '@mantine/core';
import { IconCopy, IconCheck, IconDownload } from '@tabler/icons-react';
import { OcrJob } from './types';

interface OcrResultViewProps {
  job: OcrJob;
  onCopyToNote?: (text: string) => void;
}

/**
 * OCR Result View - Displays the extracted text from an OCR job
 */
export const OcrResultView: React.FC<OcrResultViewProps> = ({ job, onCopyToNote }) => {
  if (!job.result_text) {
    return (
      <Card withBorder p="lg">
        <Text c="dimmed" ta="center">
          No text extracted
        </Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      {/* Stats */}
      <Group gap="md">
        <Badge color="green" variant="light">
          {job.result_text.split(' ').length} words
        </Badge>
        <Badge color="blue" variant="light">
          {(job.confidence || 0) * 100}% confidence
        </Badge>
        {job.language && (
          <Badge variant="light">
            {job.language}
          </Badge>
        )}
      </Group>

      {/* Extracted Text */}
      <Textarea
        value={job.result_text}
        readOnly
        minRows={10}
        maxRows={20}
        autosize
        styles={{ input: { fontFamily: 'monospace' } }}
      />

      {/* Actions */}
      <Group>
        <CopyButton value={job.result_text}>
          {({ copied, copy }) => (
            <Button
              variant={copied ? 'filled' : 'light'}
              color={copied ? 'green' : 'blue'}
              leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              onClick={copy}
            >
              {copied ? 'Copied!' : 'Copy Text'}
            </Button>
          )}
        </CopyButton>

        {onCopyToNote && (
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            onClick={() => onCopyToNote(job.result_text!)}
          >
            Save to Note
          </Button>
        )}
      </Group>
    </Stack>
  );
};

