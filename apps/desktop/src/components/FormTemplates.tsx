// apps/desktop/src/components/FormTemplates.tsx

import React, { useState, useEffect } from 'react';
import { getFormTemplatesForSpace, createFormTemplate, updateFormTemplate, deleteFormTemplate } from '@/services/api';
import { FormTemplate, FormFieldType } from '@noteece/types';
import { Button, Modal, TextInput, Group, Stack, Title, Text, Paper, ActionIcon, Select } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconTrash } from '@tabler/icons-react';
import { useStore } from '../store';

const FormTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [opened, setOpened] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const { activeSpaceId } = useStore();

  const form = useForm<{
    name: string;
    fields: Array<{ name: string; label: string; field_type: FormFieldType; default_value: string }>;
  }>({
    initialValues: {
      name: '',
      fields: [{ name: '', label: '', field_type: 'Text' as FormFieldType, default_value: '' }],
    },
  });

  const fetchTemplates = async () => {
    if (activeSpaceId) {
      const fetchedTemplates = await getFormTemplatesForSpace(activeSpaceId);
      setTemplates(fetchedTemplates);
    }
  };

  useEffect(() => {
    void fetchTemplates();
  }, [activeSpaceId]);

  const handleAddField = () => {
    form.insertListItem('fields', { name: '', label: '', field_type: 'Text' as FormFieldType, default_value: '' });
  };

  const handleRemoveField = (index: number) => {
    form.removeListItem('fields', index);
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (activeSpaceId) {
      await (selectedTemplate
        ? updateFormTemplate(selectedTemplate.id, values.name, values.fields)
        : createFormTemplate(activeSpaceId, values.name, values.fields));
      void fetchTemplates();
      setOpened(false);
      form.reset();
      setSelectedTemplate(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteFormTemplate(id);
    void fetchTemplates();
  };

  const handleEdit = (template: FormTemplate) => {
    setSelectedTemplate(template);
    form.setValues({
      name: template.name,
      fields: template.fields.map((field) => ({
        ...field,
        default_value: field.default_value ?? '',
      })),
    });
    setOpened(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    form.reset();
    setOpened(true);
  };

  return (
    <div>
      <Title order={2}>Form Templates</Title>
      <Button onClick={handleCreate}>Create New Template</Button>

      <Stack mt="md">
        {templates.map((template) => (
          <Paper key={template.id} p="md" shadow="xs" withBorder>
            <Group justify="apart">
              <Text>{template.name}</Text>
              <Group>
                <Button variant="subtle" onClick={() => handleEdit(template)}>
                  Edit
                </Button>
                <ActionIcon color="red" onClick={() => handleDelete(template.id)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={selectedTemplate ? 'Edit Template' : 'Create Template'}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Template Name" {...form.getInputProps('name')} required />
            <Title order={4}>Fields</Title>
            {form.values.fields.map((_, index) => (
              <Paper key={index} p="md" withBorder>
                <Stack>
                  <TextInput label="Field Name" {...form.getInputProps(`fields.${index}.name`)} required />
                  <TextInput label="Field Label" {...form.getInputProps(`fields.${index}.label`)} required />
                  <Select
                    label="Field Type"
                    data={['Text', 'Textarea', 'Number', 'Checkbox', 'Date', 'Time']}
                    {...form.getInputProps(`fields.${index}.field_type`)}
                  />
                  <TextInput label="Default Value" {...form.getInputProps(`fields.${index}.default_value`)} />
                  <ActionIcon color="red" onClick={() => handleRemoveField(index)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Stack>
              </Paper>
            ))}
            <Button onClick={handleAddField}>Add Field</Button>
            <Button type="submit">Save Template</Button>
          </Stack>
        </form>
      </Modal>
    </div>
  );
};

export default FormTemplates;
