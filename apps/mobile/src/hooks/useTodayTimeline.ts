import { useState, useEffect } from 'react';
import { TimelineItem, Insight, Task, CalendarEvent } from '@/types';
import { dbQuery } from '@/lib/database';
import { colors } from '@/lib/theme';
import { Logger } from '@/lib/logger';

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
          Logger.error('Failed to parse suggested actions JSON', parseError);
          suggestedActions = [];
        }

        setBrief({
          id: insightRow.id,
          insightType: insightRow.insight_type,
          title: insightRow.title,
          description: insightRow.summary || '',
          severity: insightRow.priority || 'info',
          suggestedActions,
          dismissed: insightRow.dismissed,
          createdAt: insightRow.created_at,
        } as Insight);
      }

      // Fetch tasks due today
      // Correct statuses and priority order
      const tasks = await dbQuery<any>(
        `SELECT * FROM task
         WHERE due_at BETWEEN ? AND ?
         AND status != 'done' AND status != 'cancelled'
         ORDER BY priority ASC, due_at ASC`,
        [todayStart, todayEnd],
      );

      // Fetch calendar events for today
      const events = await dbQuery<any>(
        `SELECT * FROM calendar_event
         WHERE start_time BETWEEN ? AND ?
         ORDER BY start_time ASC`,
        [todayStart, todayEnd],
      );

      // Combine into timeline items
      const items: TimelineItem[] = [];

      // Add calendar events
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

      // Add tasks - use snake_case to match Task interface
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
            space_id: taskRow.space_id,
            project_id: taskRow.project_id,
            parent_task_id: taskRow.parent_task_id,
            title: taskRow.title,
            description: taskRow.description,
            status: taskRow.status,
            priority: taskRow.priority,
            due_at: taskRow.due_at,
            completed_at: taskRow.completed_at,
            estimate_minutes: taskRow.estimate_minutes,
            recur_rule: taskRow.recur_rule,
            context: taskRow.context,
            area: taskRow.area,
          } as Task,
        });
      });

      // Sort by time
      items.sort((a, b) => a.time - b.time);

      setTimeline(items);
    } catch (error) {
      Logger.error('Failed to load timeline', error);
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
