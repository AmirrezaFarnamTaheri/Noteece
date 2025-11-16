/**
 * CategoryManager Component
 *
 * Manage social media post categories
 */

import {
  Stack,
  Group,
  Title,
  Button,
  Card,
  Text,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  ColorInput,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { getSocialCategories, createSocialCategory, deleteSocialCategory } from '../../services/socialApi';
import type { SocialCategory } from '@noteece/types';

interface CategoryManagerProperties {
  spaceId: string;
}

export function CategoryManager({ spaceId }: CategoryManagerProperties) {
  const [modalOpened, setModalOpened] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SocialCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    icon: '📁',
    keywords: '',
  });

  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['socialCategories', spaceId],
    queryFn: () => getSocialCategories(spaceId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const keywords = data.keywords
        ? data.keywords
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0)
        : null;

      return await createSocialCategory(spaceId, data.name, data.color, data.icon, keywords);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialCategories', spaceId] });
      notifications.show({
        title: 'Success',
        message: 'Category created successfully',
        color: 'green',
      });
      handleCloseModal();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: `Failed to create category: ${String(error)}`,
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => deleteSocialCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialCategories', spaceId] });
      notifications.show({
        title: 'Success',
        message: 'Category deleted successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: `Failed to delete category: ${String(error)}`,
        color: 'red',
      });
    },
  });

  const handleOpenModal = (category?: SocialCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        color: category.color || '#3b82f6',
        icon: category.icon || '📁',
        keywords: '',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        color: '#3b82f6',
        icon: '📁',
        keywords: '',
      });
    }
    setModalOpened(true);
  };

  const handleCloseModal = () => {
    setModalOpened(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      color: '#3b82f6',
      icon: '📁',
      keywords: '',
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Category name is required',
        color: 'red',
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleDelete = (categoryId: string, categoryName: string) => {
    if (window.confirm(`Are you sure you want to delete the category "${categoryName}"?`)) {
      deleteMutation.mutate(categoryId);
    }
  };

  if (isLoading) {
    return <Text>Loading categories...</Text>;
  }

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={2}>Categories</Title>
            <Text size="sm" c="dimmed">
              Organize your social media content with custom categories
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
            Create Category
          </Button>
        </Group>

        {categories && categories.length > 0 ? (
          <Stack gap="md">
            {categories.map((category) => (
              <Card key={category.id} shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between">
                  <Group>
                    <Text size="xl">{category.icon || '📁'}</Text>
                    <div>
                      <Group gap="xs">
                        <Text size="lg" fw={500}>
                          {category.name}
                        </Text>
                        {category.color && (
                          <Badge
                            color={category.color}
                            variant="light"
                            style={{ backgroundColor: category.color + '20' }}
                          >
                            {category.color}
                          </Badge>
                        )}
                      </Group>
                    </div>
                  </Group>
                  <Group>
                    <ActionIcon variant="subtle" onClick={() => handleOpenModal(category)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(category.id, category.name)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        ) : (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack align="center">
              <Text size="xl">🏷️</Text>
              <Text size="lg" fw={500}>
                No categories yet
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Create your first category to organize your social media content across platforms
              </Text>
              <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()} mt="md">
                Create Your First Category
              </Button>
            </Stack>
          </Card>
        )}
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={handleCloseModal}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        size="md"
      >
        <Stack>
          <TextInput
            label="Category Name"
            placeholder="e.g., Work, Personal, Entertainment"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
          />

          <Group grow>
            <ColorInput
              label="Color"
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
            />

            <TextInput
              label="Icon (Emoji)"
              placeholder="📁"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.currentTarget.value })}
            />
          </Group>

          <TextInput
            label="Auto-categorization Keywords"
            placeholder="keyword1, keyword2, keyword3"
            description="Posts containing these keywords will be automatically added to this category"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.currentTarget.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
