# Frontend Patterns (React/Tauri)

## State Management

We use **Zustand** for global state. It is simpler and less boilerplate-heavy than Redux.

### Stores

- **`useStore`**: The main persistent store (user settings, active space ID).
- **Transient State**: Use local `useState` or `useReducer` for UI state (modals, form inputs).
- **Server State**: Use **TanStack Query (React Query)** for data fetched from the Rust backend. **Do not** store database data in Zustand; cache it with React Query.

```typescript
// Example: Fetching Notes
const { data: notes, isLoading } = useQuery({
  queryKey: ['notes', spaceId],
  queryFn: () => api.getNotes(spaceId),
});
```

## Component Structure

- **Container/View:** High-level pages (e.g., `ProjectHub.tsx`). Handles data fetching and layout.
- **Presentational:** Smaller, reusable components (e.g., `ProjectCard.tsx`). Receives data via props. Pure functions when possible.

## Tauri Integration

We use a localized `api.ts` service layer to wrap `tauri.invoke`.

- **Type Safety:** Define return types explicitly.
- **Error Handling:** Wrap invokes in `try/catch` and log errors to the `logger` utility.

```typescript
// api.ts
export async function getProjects(spaceId: string): Promise<Project[]> {
  return await invoke('get_projects_cmd', { spaceId });
}
```

## CSS / Styling

- **Mantine UI:** Our primary component library. Use Mantine components (`<Group>`, `<Stack>`, `<Text>`) for layout and typography.
- **Tailwind CSS:** Used for utility classes (padding, margins, colors) where Mantine props are insufficient.
- **Theme:** Defined in `theme.ts`. Use `theme.colors.dark[9]` for backgrounds to maintain the "Deep Obsidian" aesthetic.
