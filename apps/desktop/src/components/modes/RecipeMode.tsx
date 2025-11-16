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
  NumberInput,
  Select,
  Grid,
  Modal,
  Badge,
  Center,
  Loader,
} from '@mantine/core';
import { IconPlus, IconClock, IconUsers, IconChefHat } from '@tabler/icons-react';
import { logger } from '../../utils/logger';

interface Recipe {
  id: string;
  space_id: string;
  note_id: string;
  name: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings: number;
  difficulty: string;
  cuisine?: string;
  diet_type?: string;
  meal_type?: string;
  created_at: number;
}

const RecipeMode: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);

  const [formName, setFormName] = useState('');
  const [formServings, setFormServings] = useState(4);
  const [formDifficulty, setFormDifficulty] = useState('medium');

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await invoke<Recipe[]>('get_recipes_cmd', { spaceId, limit: 50 });
      setRecipes(data);
    } catch (error) {
      logger.error('Failed to load recipes:', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const addRecipe = async () => {
    try {
      if (!formName) {
        alert('Please provide a recipe name.');
        return;
      }
      const servingsNumber = Number(formServings);
      if (!Number.isFinite(servingsNumber) || servingsNumber < 1 || !Number.isInteger(servingsNumber)) {
        alert('Servings must be a positive integer.');
        return;
      }

      // Create backing note and use its id
      const noteId = await invoke<string>('create_note_for_recipe_cmd', {
        spaceId,
        title: formName,
        metadata: { servings: servingsNumber, difficulty: formDifficulty },
      });
      if (!noteId) {
        alert('Failed to create note for the recipe.');
        return;
      }

      await invoke('create_recipe_cmd', {
        spaceId,
        noteId,
        name: formName,
        servings: servingsNumber,
        difficulty: formDifficulty,
      });

      setModalOpened(false);
      setFormName('');
      setFormServings(4);
      await loadData();
    } catch (error) {
      logger.error('Failed to add recipe:', error as Error);
      alert(`Failed to add recipe: ${String(error)}`);
    }
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
            <Title order={2}>Recipe Collection</Title>
            <Text c="dimmed" size="sm">
              Organize and plan your meals
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
            Add Recipe
          </Button>
        </Group>

        <Grid>
          {recipes.map((recipe) => (
            <Grid.Col key={recipe.id} span={4}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={600}>{recipe.name}</Text>
                    <Badge color="blue">{recipe.difficulty}</Badge>
                  </Group>
                  <Group gap="xs">
                    <Group gap={4}>
                      <IconUsers size={14} />
                      <Text size="xs">{recipe.servings} servings</Text>
                    </Group>
                    {recipe.prep_time_minutes && (
                      <Group gap={4}>
                        <IconClock size={14} />
                        <Text size="xs">{recipe.prep_time_minutes}m prep</Text>
                      </Group>
                    )}
                  </Group>
                  {recipe.cuisine && (
                    <Badge variant="light" size="sm">
                      {recipe.cuisine}
                    </Badge>
                  )}
                  {recipe.meal_type && (
                    <Badge variant="outline" size="sm">
                      {recipe.meal_type}
                    </Badge>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        {recipes.length === 0 && (
          <Center h={200}>
            <Stack align="center">
              <IconChefHat size={48} stroke={1.5} color="gray" />
              <Text c="dimmed">No recipes yet. Add your first recipe!</Text>
            </Stack>
          </Center>
        )}
      </Stack>

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Add Recipe">
        <Stack gap="md">
          <TextInput
            label="Recipe Name"
            value={formName}
            onChange={(e) => setFormName(e.currentTarget.value)}
            required
          />
          <NumberInput
            label="Servings"
            value={formServings}
            onChange={(value) => setFormServings(Number(value))}
            min={1}
            required
          />
          <Select
            label="Difficulty"
            value={formDifficulty}
            onChange={(value) => setFormDifficulty(value || 'medium')}
            data={[
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={addRecipe} disabled={!formName}>
              Add Recipe
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default RecipeMode;
