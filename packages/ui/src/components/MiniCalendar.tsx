import React, { useState } from "react";
import {
  Card,
  Group,
  Text,
  Stack,
  UnstyledButton,
  Badge,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCircleFilled,
} from "@tabler/icons-react";

export interface CalendarEvent {
  id: string;
  title: string;
  date: number; // Unix timestamp
  type: "task" | "event" | "deadline" | "habit";
  color?: string;
  completed?: boolean;
}

export interface MiniCalendarProps {
  events: CalendarEvent[];
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export function MiniCalendar({
  events,
  onDateSelect,
  onEventClick,
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Precompute event map by local date key once per render
  const toKey = (t: number) => {
    const d = new Date(t * 1000);
    // Normalize to local midnight to avoid timezone drift across boundaries
    d.setHours(0, 0, 0, 0);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const k = toKey(ev.date);
      const arr = map.get(k);
      if (arr) arr.push(ev);
      else map.set(k, [ev]);
    }
    return map;
  }, [events]);

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay(); // 0=Sun..6=Sat

    // Compute the date of the grid start (Sunday before or equal to firstOfMonth)
    const gridStart = new Date(year, month, 1 - startDay);
    const days: Date[] = [];

    // Always render 6 weeks (6*7=42) to keep a stable grid
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }

    return days;
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return eventsByDay.get(`${y}-${m}-${d}`) ?? [];
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Text size="lg" fw={600}>
            {currentMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Group gap={4}>
            <ActionIcon variant="subtle" onClick={previousMonth}>
              <IconChevronLeft size={18} />
            </ActionIcon>
            <ActionIcon variant="subtle" onClick={nextMonth}>
              <IconChevronRight size={18} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Calendar Grid */}
        <div>
          {/* Week day headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              marginBottom: 4,
            }}
          >
            {weekDays.map((day) => (
              <Text key={day} size="xs" c="dimmed" ta="center" fw={600}>
                {day}
              </Text>
            ))}
          </div>

          {/* Days grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
            }}
          >
            {days.map((day, idx) => {
              const dayEvents = getEventsForDate(day);
              const hasEvents = dayEvents.length > 0;
              const today = isToday(day);
              const currentMonthDay = isCurrentMonth(day);

              return (
                <Tooltip
                  key={idx}
                  label={
                    hasEvents ? (
                      <Stack gap={2}>
                        {dayEvents.map((event) => (
                          <Text key={event.id} size="xs">
                            {event.title}
                          </Text>
                        ))}
                      </Stack>
                    ) : null
                  }
                  disabled={!hasEvents}
                >
                  <UnstyledButton
                    onClick={() => onDateSelect?.(day)}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 4,
                      backgroundColor: today
                        ? "var(--mantine-color-blue-1)"
                        : "transparent",
                      border: today
                        ? "2px solid var(--mantine-color-blue-6)"
                        : "1px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      opacity: currentMonthDay ? 1 : 0.3,
                      position: "relative",
                    }}
                  >
                    <Text
                      size="sm"
                      fw={today ? 700 : 500}
                      c={
                        today ? "blue" : currentMonthDay ? undefined : "dimmed"
                      }
                    >
                      {day.getDate()}
                    </Text>
                    {hasEvents && (
                      <Group
                        gap={2}
                        style={{ position: "absolute", bottom: 2 }}
                      >
                        {dayEvents.slice(0, 3).map((event, eventIdx) => (
                          <div
                            key={eventIdx}
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              backgroundColor: `var(--mantine-color-${event.color || "blue"}-6)`,
                            }}
                          />
                        ))}
                      </Group>
                    )}
                  </UnstyledButton>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Upcoming events list */}
        {events.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={600} c="dimmed">
              Upcoming
            </Text>
            {events
              .filter((event) => event.date >= Math.floor(Date.now() / 1000))
              .sort((a, b) => a.date - b.date)
              .slice(0, 5)
              .map((event) => (
                <UnstyledButton
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  style={{
                    padding: "8px",
                    borderRadius: 4,
                    backgroundColor: "var(--mantine-color-gray-0)",
                    border: "1px solid var(--mantine-color-gray-3)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      <IconCircleFilled
                        size={8}
                        color={`var(--mantine-color-${event.color || "blue"}-6)`}
                      />
                      <Text size="sm" fw={500} lineClamp={1}>
                        {event.title}
                      </Text>
                    </Group>
                    <Badge
                      size="xs"
                      variant="light"
                      color={event.color || "blue"}
                    >
                      {event.type}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" ml={16}>
                    {new Date(event.date * 1000).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                </UnstyledButton>
              ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

// Compact month view (no event list)
export function CompactCalendar({
  events,
  onDateSelect,
}: Pick<MiniCalendarProps, "events" | "onDateSelect">) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];
    const firstDayOfWeek = firstDay.getDay();

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    // Normalize to local day by Y/M/D to avoid timezone drift
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();

    return events.filter((event) => {
      const e = new Date(event.date * 1000);
      return e.getFullYear() === y && e.getMonth() === m && e.getDate() === d;
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Text size="md" fw={600}>
          {currentMonth.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
        </Text>
        <Group gap={4}>
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() - 1,
                  1,
                ),
              )
            }
          >
            <IconChevronLeft size={14} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1,
                  1,
                ),
              )
            }
          >
            <IconChevronRight size={14} />
          </ActionIcon>
        </Group>
      </Group>

      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 2,
            marginBottom: 2,
          }}
        >
          {weekDays.map((day) => (
            <Text key={day} size="xs" c="dimmed" ta="center" fw={600}>
              {day}
            </Text>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 2,
          }}
        >
          {days.map((day, idx) => {
            const hasEvents = getEventsForDate(day).length > 0;
            const today = isToday(day);

            return (
              <UnstyledButton
                key={idx}
                onClick={() => onDateSelect?.(day)}
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 4,
                  backgroundColor: today
                    ? "var(--mantine-color-blue-1)"
                    : hasEvents
                      ? "var(--mantine-color-gray-1)"
                      : "transparent",
                  border: today
                    ? "1px solid var(--mantine-color-blue-6)"
                    : "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                <Text
                  size="xs"
                  fw={today ? 700 : 500}
                  c={today ? "blue" : undefined}
                >
                  {day.getDate()}
                </Text>
              </UnstyledButton>
            );
          })}
        </div>
      </div>
    </Stack>
  );
}
