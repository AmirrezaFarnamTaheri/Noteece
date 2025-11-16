import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Table, Button, Modal, TextInput, Select } from '@mantine/core';
import { useForm } from '@mantine/form';
import { getProjectRisks, createProjectRisk } from '@/services/api';
import { ProjectRisk } from '@noteece/types';
import { logger } from '../../utils/logger';

interface RisksContext {
  projectId: string;
}

const Risks: React.FC = () => {
  const { projectId } = useOutletContext<RisksContext>();
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [opened, setOpened] = useState(false);

  const form = useForm({
    initialValues: {
      description: '',
      likelihood: '',
      impact: '',
    },
  });

  const fetchRisks = async () => {
    if (projectId) {
      try {
        const risksData = await getProjectRisks(projectId);
        setRisks(risksData);
      } catch (error) {
        logger.error('Error fetching risks:', error as Error);
      }
    }
  };

  useEffect(() => {
    void fetchRisks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await createProjectRisk(projectId, values.description, values.likelihood, values.impact);
      void fetchRisks();
      setOpened(false);
      form.reset();
    } catch (error) {
      logger.error('Error creating risk:', error as Error);
    }
  };

  const rows = risks.map((risk) => (
    <tr key={risk.id}>
      <td>{risk.description}</td>
      <td>{risk.likelihood}</td>
      <td>{risk.impact}</td>
      <td>{risk.mitigation}</td>
    </tr>
  ));

  return (
    <div>
      <Button onClick={() => setOpened(true)}>Create Risk</Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Create New Risk">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput label="Description" {...form.getInputProps('description')} required />
          <Select label="Likelihood" data={['Low', 'Medium', 'High']} {...form.getInputProps('likelihood')} required />
          <Select label="Impact" data={['Low', 'Medium', 'High']} {...form.getInputProps('impact')} required />
          <Button type="submit" mt="md">
            Create
          </Button>
        </form>
      </Modal>
      <Table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Likelihood</th>
            <th>Impact</th>
            <th>Mitigation</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </Table>
    </div>
  );
};

export default Risks;
