import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { Task, Project } from '@noteece/types';
import { Tabs, List, ThemeIcon } from '@mantine/core';
import { IconCircleDashed } from '@tabler/icons-react';
import { useStore } from '../store';
import { getAllProjectsInSpace } from '@/services/api';
import { logger } from '@/utils/logger';

const ProjectHub: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { activeSpaceId } = useStore();

  useEffect(() => {
    const fetchProjects = async () => {
      if (activeSpaceId) {
        try {
          const projectsData = await getAllProjectsInSpace(activeSpaceId);
          setProjects(projectsData);
          if (projectsData.length > 0) {
            setSelectedProjectId(projectsData[0].id);
          }
        } catch (error) {
          logger.error('Error fetching projects:', error as Error);
        }
      }
    };
    void fetchProjects();
  }, [activeSpaceId]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (selectedProjectId) {
        try {
          const tasksData: Task[] = await invoke('get_tasks_by_project_cmd', { projectId: selectedProjectId });
          setTasks(tasksData);
        } catch (error) {
          logger.error('Error fetching tasks:', error as Error);
        }
      }
    };

    void fetchTasks();
  }, [selectedProjectId]);

  const handleTabChange = (value: string | null) => {
    if (value) {
      navigate(value);
    }
  };

  return (
    <div>
      <h2>Project Hub</h2>

      <List
        spacing="xs"
        size="sm"
        center
        icon={
          <ThemeIcon color="teal" size={24} radius="xl">
            <IconCircleDashed size="1rem" />
          </ThemeIcon>
        }
      >
        {projects.map((project) => (
          <List.Item key={project.id} onClick={() => setSelectedProjectId(project.id)}>
            {project.title}
          </List.Item>
        ))}
      </List>

      <Tabs defaultValue="overview" onChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="kanban">Kanban</Tabs.Tab>
          <Tabs.Tab value="timeline">Timeline</Tabs.Tab>
          <Tabs.Tab value="risks">Risks</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          {selectedProjectId && <Outlet context={{ tasks, projectId: selectedProjectId }} />}
        </Tabs.Panel>
        <Tabs.Panel value="kanban">
          {selectedProjectId && <Outlet context={{ tasks, projectId: selectedProjectId }} />}
        </Tabs.Panel>
        <Tabs.Panel value="timeline">
          {selectedProjectId && <Outlet context={{ tasks, projectId: selectedProjectId }} />}
        </Tabs.Panel>
        <Tabs.Panel value="risks">
          {selectedProjectId && <Outlet context={{ tasks, projectId: selectedProjectId }} />}
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};

export default ProjectHub;
