import React from 'react';
import { Timeline, TimelineHeaders, SidebarHeader, DateHeader } from 'react-calendar-timeline';
// Note: CSS import removed as react-calendar-timeline@0.30.0-beta.4 doesn't include pre-built CSS
// Custom styling should be added via Mantine or inline styles if needed
import moment from 'moment';
import { useOutletContext } from 'react-router-dom';
import { Task, ProjectMilestone } from '@noteece/types';
import { getProjectMilestones } from '@/services/api';
import { logger } from '../../utils/logger';

interface TimelineContext {
  tasks: Task[];
  projectId: string;
}

const ProjectTimeline: React.FC = () => {
  const { tasks, projectId } = useOutletContext<TimelineContext>();
  const [milestones, setMilestones] = React.useState<ProjectMilestone[]>([]);

  React.useEffect(() => {
    const fetchMilestones = async () => {
      if (projectId) {
        try {
          const milestonesData = await getProjectMilestones(projectId);
          setMilestones(milestonesData);
        } catch (error) {
          logger.error('Error fetching milestones:', error as Error);
        }
      }
    };

    void fetchMilestones();
  }, [projectId]);

  const groups = [
    { id: 1, title: 'Tasks' },
    { id: 2, title: 'Milestones' },
  ];

  const taskItems = tasks
    .filter((t) => typeof t.start_at === 'number' && typeof t.due_at === 'number')
    .map((task, index) => ({
      id: `t-${index}`,
      group: 1,
      title: task.title,
      start_time: moment(task.start_at! * 1000).valueOf(),
      end_time: moment(task.due_at! * 1000).valueOf(),
    }));

  const milestoneItems = milestones
    .filter((m) => typeof m.due_at === 'number')
    .map((milestone, index) => ({
      id: `m-${index}`,
      group: 2,
      title: milestone.title,
      start_time: moment(milestone.due_at! * 1000)
        .subtract(1, 'day')
        .valueOf(),
      end_time: moment(milestone.due_at! * 1000).valueOf(),
    }));

  const items = [...taskItems, ...milestoneItems];

  return (
    <Timeline
      groups={groups}
      items={items}
      defaultTimeStart={moment().add(-1, 'month').valueOf()}
      defaultTimeEnd={moment().add(1, 'month').valueOf()}
    >
      <TimelineHeaders>
        <SidebarHeader>
          {({ getRootProps }) => {
            return <div {...getRootProps()}></div>;
          }}
        </SidebarHeader>
        <DateHeader unit="primaryHeader" />
        <DateHeader />
      </TimelineHeaders>
    </Timeline>
  );
};

export default ProjectTimeline;
