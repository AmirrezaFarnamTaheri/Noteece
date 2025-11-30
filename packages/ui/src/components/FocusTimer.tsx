import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Group, Text, Stack, Progress, Select, ActionIcon } from '@mantine/core';
import { IconPlayerPlay, IconPlayerPause, IconRefresh, IconSettings } from '@tabler/icons-react';

export interface FocusTimerProps {
  onComplete?: () => void;
  onStart?: () => void;
  onPause?: () => void;
  onReset?: () => void;
}

type TimerMode = 'focus' | 'short-break' | 'long-break';

const TIMER_PRESETS: Record<TimerMode, number> = {
  focus: 25 * 60, // 25 minutes
  'short-break': 5 * 60, // 5 minutes
  'long-break': 15 * 60, // 15 minutes
};

export function FocusTimer({ onComplete, onStart, onPause, onReset }: FocusTimerProps) {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(TIMER_PRESETS[mode]);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<() => void>(() => {});

  const totalTime = TIMER_PRESETS[mode];
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  useEffect(() => {
    tickRef.current = () => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setCompleted((c) => c + 1);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    };
  }, [onComplete]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      tickRef.current();
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    onStart?.();
  }, [onStart]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
    onPause?.();
  }, [onPause]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(TIMER_PRESETS[mode]);
    onReset?.();
  }, [mode, onReset]);

  const handleModeChange = useCallback((newMode: string | null) => {
    if (!newMode) return;
    const typedMode = newMode as TimerMode;
    setMode(typedMode);
    setTimeLeft(TIMER_PRESETS[typedMode]);
    setIsRunning(false);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeColor = (): string => {
    switch (mode) {
      case 'focus':
        return 'blue';
      case 'short-break':
        return 'green';
      case 'long-break':
        return 'teal';
      default:
        return 'gray';
    }
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="lg" fw={600}>
            Focus Timer
          </Text>
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Completed: {completed}
            </Text>
          </Group>
        </Group>

        <Select
          value={mode}
          onChange={handleModeChange}
          data={[
            { value: 'focus', label: 'Focus (25 min)' },
            { value: 'short-break', label: 'Short Break (5 min)' },
            { value: 'long-break', label: 'Long Break (15 min)' },
          ]}
          disabled={isRunning}
        />

        <Stack gap="xs" align="center">
          <Text
            size="4rem"
            fw={700}
            style={{
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.05em',
            }}
          >
            {formatTime(timeLeft)}
          </Text>

          <Progress value={progress} color={getModeColor()} size="lg" radius="xl" w="100%" />
        </Stack>

        <Group grow>
          {!isRunning ? (
            <Button
              leftSection={<IconPlayerPlay size={18} />}
              onClick={handleStart}
              color={getModeColor()}
              disabled={timeLeft === 0}
            >
              Start
            </Button>
          ) : (
            <Button leftSection={<IconPlayerPause size={18} />} onClick={handlePause} color={getModeColor()}>
              Pause
            </Button>
          )}

          <Button leftSection={<IconRefresh size={18} />} onClick={handleReset} variant="light" color="gray">
            Reset
          </Button>
        </Group>

        {timeLeft === 0 && (
          <Text size="sm" c="green" ta="center" fw={500}>
            ✓ Session complete! Take a break.
          </Text>
        )}
      </Stack>
    </Card>
  );
}

// Minimal variant
export function MinimalFocusTimer({ onComplete }: Pick<FocusTimerProps, 'onComplete'>) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Group gap="xs">
      <Text size="lg" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(timeLeft)}
      </Text>
      <ActionIcon onClick={() => setIsRunning(!isRunning)} variant="light" color={isRunning ? 'red' : 'blue'} size="lg">
        {isRunning ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
      </ActionIcon>
    </Group>
  );
}
