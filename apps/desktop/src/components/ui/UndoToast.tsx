import React from 'react';
import { Button, Group, Paper, Text, Transition, rem } from '@mantine/core';
import { IconArrowBackUp } from '@tabler/icons-react';
import { useUndoToast } from '@/store/undoStore';

export const UndoToast = () => {
  const { visible, message, action, hide } = useUndoToast();

  const handleUndo = () => {
    action();
    hide();
  };

  return (
    <Transition mounted={visible} transition="slide-up" duration={200} timingFunction="ease">
      {(styles) => (
        <Paper
          style={{
            ...styles,
            position: 'fixed',
            bottom: rem(20),
            left: '50%',
            transform: `translateX(-50%) ${styles.transform}`,
            zIndex: 1000,
            backgroundColor: 'var(--mantine-color-body)',
            border: '1px solid var(--mantine-color-default-border)',
          }}
          shadow="lg"
          p="xs"
          radius="md"
          withBorder
        >
          <Group gap="md" px="xs">
            <Text size="sm" fw={500}>
              {message}
            </Text>
            <Button
              variant="subtle"
              size="xs"
              color="blue"
              leftSection={<IconArrowBackUp size={14} />}
              onClick={handleUndo}
            >
              Undo
            </Button>
            <Button variant="transparent" size="xs" color="gray" onClick={hide} px={4}>
              ✕
            </Button>
          </Group>
        </Paper>
      )}
    </Transition>
  );
};
