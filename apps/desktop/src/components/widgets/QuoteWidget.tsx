import React from 'react';
import { Card, Text, Group, ThemeIcon, Stack, Box } from '@mantine/core';
import { IconQuote } from '@tabler/icons-react';
import { Quote } from '@noteece/types';

interface QuoteWidgetProps {
  quote: Quote | null;
}

export const QuoteWidget: React.FC<QuoteWidgetProps> = ({ quote }) => {
  if (!quote) return null;

  return (
    <Card
      withBorder
      radius="lg"
      p="lg"
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: 140,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -10,
          right: -10,
          opacity: 0.05,
          transform: 'rotate(15deg)',
        }}
      >
        <IconQuote size={120} />
      </div>

      <Stack gap="sm" style={{ zIndex: 1, position: 'relative' }}>
        <Group align="flex-start" gap="xs">
          <ThemeIcon variant="light" color="violet" size="sm" radius="xl">
            <IconQuote size={14} />
          </ThemeIcon>
          <Text
            c="gray.3"
            size="lg"
            fw={500}
            style={{
              fontFamily: 'serif',
              fontStyle: 'italic',
              lineHeight: 1.4,
              flex: 1,
            }}
          >
            "{quote.text}"
          </Text>
        </Group>

        <Group justify="flex-end">
          <Box
            style={{
              height: 1,
              width: 40,
              backgroundColor: 'var(--mantine-color-violet-8)',
              marginRight: 8,
            }}
          />
          <Text c="dimmed" size="sm" fw={600} tt="uppercase" style={{ letterSpacing: 1 }}>
            {quote.author}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
};
