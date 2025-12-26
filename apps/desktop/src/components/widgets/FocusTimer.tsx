import { useState, useEffect, useRef, memo } from 'react';
import { Paper, Text, Group, Button, Stack, Select, RingProgress } from '@mantine/core';
import { IconClock, IconPlayerPlay, IconPlayerPause, IconRefresh } from '@tabler/icons-react';
import { showSuccess, showInfo } from '../../utils/notifications';
import classes from '../Dashboard.module.css';

const PRESET_TIMES = [
  { value: '15', label: '15 minutes' },
  { value: '25', label: '25 minutes (Pomodoro)' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '60 minutes' },
];

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const FocusTimerComponent: React.FC = () => {
  const [duration, setDuration] = useState('25');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalReference = useRef<number | null>(null);

  const totalSeconds = Number.parseInt(duration) * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  useEffect(() => {
    if (!isRunning) {
      if (intervalReference.current) {
        clearInterval(intervalReference.current);
        intervalReference.current = null;
      }
      return;
    }

    intervalReference.current = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          if (intervalReference.current) {
            clearInterval(intervalReference.current);
            intervalReference.current = null;
          }
          setIsRunning(false);
          setIsFinished(true);
          showSuccess({
            title: 'Focus Session Complete!',
            message: 'Great job! Time for a break.',
          });
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => {
      if (intervalReference.current) {
        clearInterval(intervalReference.current);
        intervalReference.current = null;
      }
    };
  }, [isRunning]);

  const handleStart = () => {
    if (timeLeft === 0) {
      setTimeLeft(totalSeconds);
      setIsFinished(false);
    }
    setIsRunning(true);
    showInfo({
      message: 'Focus session started. Stay focused!',
    });
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(Number.parseInt(duration) * 60);
    setIsFinished(false);
  };

  const handleDurationChange = (value: string | null) => {
    if (value) {
      setDuration(value);
      setTimeLeft(Number.parseInt(value) * 60);
      setIsRunning(false);
      setIsFinished(false);
    }
  };

  return (
    <Paper style={{ border: '1px solid #e0e0e0' }} p="md" radius="md" shadow="xs">
      <Group mb="md">
        <IconClock size={20} />
        <Text className={classes.title} fz="xs" c="dimmed">
          Focus Timer
        </Text>
      </Group>

      <Stack align="center" gap="lg" mt="xl">
        <RingProgress
          size={160}
          thickness={16}
          sections={[{ value: progress, color: isFinished ? 'green' : 'blue' }]}
          label={
            <Stack align="center" gap={0}>
              <Text size="xl" fw={700}>
                {formatTime(timeLeft)}
              </Text>
              <Text size="xs" c="dimmed">
                {isFinished ? 'Complete!' : (isRunning ? 'Running' : 'Ready')}
              </Text>
            </Stack>
          }
        />

        <Select
          data={PRESET_TIMES}
          value={duration}
          onChange={handleDurationChange}
          disabled={isRunning}
          style={{ width: '100%' }}
        />

        <Group gap="xs">
          {isRunning ? (
            <Button leftSection={<IconPlayerPause size={16} />} onClick={handlePause} color="orange">
              Pause
            </Button>
          ) : (
            <Button leftSection={<IconPlayerPlay size={16} />} onClick={handleStart} color="blue">
              Start
            </Button>
          )}
          <Button leftSection={<IconRefresh size={16} />} onClick={handleReset} variant="light">
            Reset
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
};

export const FocusTimer = memo(FocusTimerComponent);
