import { useState, useEffect } from 'react';
import { TimelineItem, Insight, Task, CalendarEvent } from '@/types';
import { dbQuery } from '@/lib/database';
import { colors } from '@/lib/theme';

interface UseTodayTimelineReturn {
  timeline: TimelineItem[];
  brief: Insight | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useTodayTimeline(): UseTodayTimelineReturn {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [brief, setBrief] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTimeline = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = todayStart + 86400000; // 24 hours

      // Fetch daily brief (Foresight insight)
      // Note: Database returns snake_case, so we use any and map to camelCase
      const insights = await dbQuery<any>(
        `SELECT * FROM insight
         WHERE insight_type = 'daily_brief'
         AND dismissed = 0
         ORDER BY created_at DESC
         LIMIT 1`,
      );

      if (insights.length > 0) {
        const insightRow = insights[0];
        let suggestedActions = [];

        try {
          suggestedActions = JSON.parse(insightRow.suggested_actions_json || '[]');
        } catch (parseError) {
          console.error('Failed to parse suggested actions JSON:', parseError);
          suggestedActions = [];
        }

        // Explicitly map insight row to camelCase interface
        setBrief({
          id: insightRow.id,
          insightType: insightRow.insight_type,
          title: insightRow.title,
          description: insightRow.summary || '', // Map summary to description
          severity: insightRow.priority || 'info', // Map priority to severity
          suggestedActions,
          dismissed: insightRow.dismissed,
          createdAt: insightRow.created_at,
        } as Insight);
      }

      // Fetch tasks due today
      // Note: Database returns snake_case, so we use any and map to camelCase
      const tasks = await dbQuery<any>(
        `SELECT * FROM task
         WHERE due_at BETWEEN ? AND ?
         AND status != 'completed'
         ORDER BY priority DESC, due_at ASC`,
        [todayStart, todayEnd],
      );

      // Fetch calendar events for today
      // Note: Database returns snake_case, so we use any and map to camelCase
      const events = await dbQuery<any>(
        `SELECT * FROM calendar_event
         WHERE start_time BETWEEN ? AND ?
         ORDER BY start_time ASC`,
        [todayStart, todayEnd],
      );

      // Combine into timeline items
      const items: TimelineItem[] = [];

      // Add calendar events - normalize snake_case to camelCase
      events.forEach((eventRow) => {
        items.push({
          id: eventRow.id,
          type: 'event',
          time: eventRow.start_time,
          endTime: eventRow.end_time,
          title: eventRow.title,
          subtitle: eventRow.location,
          color: eventRow.color || colors.primary,
          data: {
            id: eventRow.id,
            title: eventRow.title,
            description: eventRow.description,
            location: eventRow.location,
            startTime: eventRow.start_time,
            endTime: eventRow.end_time,
            source: eventRow.source || 'internal',
            color: eventRow.color || colors.primary,
          } as CalendarEvent,
        });
      });

      // Add tasks - normalize snake_case to camelCase
      tasks.forEach((taskRow) => {
        items.push({
          id: taskRow.id,
          type: 'task',
          time: taskRow.due_at || todayStart,
          title: taskRow.title,
          subtitle: taskRow.description,
          color: colors.primary,
          data: {
            id: taskRow.id,
            spaceId: taskRow.space_id,
            projectId: taskRow.project_id,
            title: taskRow.title,
            description: taskRow.description,
            status: taskRow.status,
            priority: taskRow.priority,
            dueAt: taskRow.due_at,
            completedAt: taskRow.completed_at,
            progress: taskRow.progress,
            createdAt: taskRow.created_at || Date.now(),
            updatedAt: taskRow.updated_at || Date.now(),
          } as Task,
        });
      });

      // Sort by time
      items.sort((a, b) => a.time - b.time);

      setTimeline(items);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  return {
    timeline,
    brief,
    loading,
    refresh: loadTimeline,
  };
}
