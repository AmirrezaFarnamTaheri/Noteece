import React from 'react';
import { Container, Title, Text, Card, SimpleGrid, ThemeIcon, Group } from '@mantine/core';
import { IconPlane, IconMapPin, IconCalendarEvent } from '@tabler/icons-react';

const TravelMode: React.FC = () => {
  return (
    <Container p="xl">
      <Title order={2} mb="lg">
        Travel Mode
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        <Card withBorder padding="lg">
          <Group mb="md">
            <ThemeIcon size="lg" color="blue" variant="light">
              <IconPlane />
            </ThemeIcon>
            <Text fw={700}>Upcoming Trips</Text>
          </Group>
          <Text size="sm" c="dimmed">
            No upcoming trips scheduled.
          </Text>
        </Card>

        <Card withBorder padding="lg">
          <Group mb="md">
            <ThemeIcon size="lg" color="green" variant="light">
              <IconMapPin />
            </ThemeIcon>
            <Text fw={700}>Destinations</Text>
          </Group>
          <Text size="sm" c="dimmed">
            0 places saved.
          </Text>
        </Card>

        <Card withBorder padding="lg">
          <Group mb="md">
            <ThemeIcon size="lg" color="orange" variant="light">
              <IconCalendarEvent />
            </ThemeIcon>
            <Text fw={700}>Itinerary</Text>
          </Group>
          <Text size="sm" c="dimmed">
            Plan your next adventure.
          </Text>
        </Card>
      </SimpleGrid>
    </Container>
  );
};

export default TravelMode;
