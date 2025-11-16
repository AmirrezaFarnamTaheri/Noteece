import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Container,
  Title,
  Card,
  Text,
  Button,
  Group,
  Stack,
  TextInput,
  Grid,
  Modal,
  Badge,
  Center,
  Loader,
  Timeline,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconPlus, IconPlane, IconMapPin, IconCalendar } from '@tabler/icons-react';
import { logger } from '../../utils/logger';

interface Trip {
  id: string;
  space_id: string;
  note_id: string;
  name: string;
  destination: string;
  start_date: number;
  end_date: number;
  status: string;
  budget?: number;
  currency?: string;
  created_at: number;
}

const statusColors: Record<string, string> = {
  planning: 'blue',
  upcoming: 'cyan',
  active: 'green',
  completed: 'gray',
  cancelled: 'red',
};

const TravelMode: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formStartDate, setFormStartDate] = useState<Date>(new Date());
  const [formEndDate, setFormEndDate] = useState<Date>(new Date());

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await invoke<Trip[]>('get_trips_cmd', { spaceId, limit: 50 });
      setTrips(data);
    } catch (error) {
      logger.error('Failed to load trips:', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const addTrip = async () => {
    try {
      if (!formName || !formDestination) {
        alert('Please provide a trip name and destination.');
        return;
      }

      const startTs = Math.floor(formStartDate.getTime() / 1000);
      const endTs = Math.floor(formEndDate.getTime() / 1000);
      if (endTs < startTs) {
        alert('End date cannot be earlier than start date.');
        return;
      }

      // Create the backing note first to obtain a valid note_id
      const noteId = await invoke<string>('create_note_for_trip_cmd', {
        spaceId,
        title: formName,
        metadata: { destination: formDestination, start_date: startTs, end_date: endTs },
      });

      if (!noteId) {
        alert('Failed to create backing note for the trip.');
        return;
      }

      await invoke('create_trip_cmd', {
        spaceId,
        noteId,
        name: formName,
        destination: formDestination,
        startDate: startTs,
        endDate: endTs,
      });

      setModalOpened(false);
      setFormName('');
      setFormDestination('');
      await loadData();
    } catch (error) {
      logger.error('Failed to add trip:', error as Error);
      alert(`Failed to add trip: ${String(error)}`);
    }
  };

  const getDuration = (trip: Trip) => {
    const days = Math.ceil((trip.end_date - trip.start_date) / 86_400);
    if (days === 1) {
      return `${days} day`;
    }
    return `${days} days`;
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={2}>Travel Planner</Title>
            <Text c="dimmed" size="sm">
              Plan and organize your trips
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
            New Trip
          </Button>
        </Group>

        <Grid>
          {trips.map((trip) => (
            <Grid.Col key={trip.id} span={6}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconPlane size={20} />
                      <Text fw={600} size="lg">
                        {trip.name}
                      </Text>
                    </Group>
                    <Badge color={statusColors[trip.status]}>{trip.status}</Badge>
                  </Group>

                  <Group gap="xs">
                    <IconMapPin size={16} />
                    <Text size="sm" c="dimmed">
                      {trip.destination}
                    </Text>
                  </Group>

                  <Group gap="xs">
                    <IconCalendar size={16} />
                    <Text size="sm">
                      {new Date(trip.start_date * 1000).toLocaleDateString()} -{' '}
                      {new Date(trip.end_date * 1000).toLocaleDateString()}
                    </Text>
                  </Group>

                  <Badge variant="light" size="sm">
                    {getDuration(trip)}
                  </Badge>

                  {trip.budget && (
                    <Text size="sm" fw={500}>
                      Budget: {trip.currency || '$'}
                      {trip.budget.toFixed(2)}
                    </Text>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        {trips.length === 0 && (
          <Center h={200}>
            <Stack align="center">
              <IconPlane size={48} stroke={1.5} color="gray" />
              <Text c="dimmed">No trips planned yet. Start planning your next adventure!</Text>
            </Stack>
          </Center>
        )}
      </Stack>

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Plan New Trip" size="lg">
        <Stack gap="md">
          <TextInput
            label="Trip Name"
            value={formName}
            onChange={(e) => setFormName(e.currentTarget.value)}
            placeholder="Summer Vacation 2025"
            required
          />
          <TextInput
            label="Destination"
            value={formDestination}
            onChange={(e) => setFormDestination(e.currentTarget.value)}
            placeholder="Paris, France"
            required
          />
          <DatePicker
            value={formEndDate}
            onChange={(value) => {
              if (value) {
                setFormEndDate(value as unknown as Date);
              }
            }}
            minDate={formStartDate}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={addTrip} disabled={!formName || !formDestination}>
              Create Trip
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default TravelMode;
