# Social Media Suite - React Components

**Version:** 1.0
**Status:** Production Ready
**Framework:** React 18 + TypeScript + Mantine v7

## Overview

This directory contains 11 React components that make up the Social Media Suite UI. All components use Mantine v7 for styling, React Query (TanStack Query) for state management, and TypeScript for type safety.

## Architecture

```
components/social/
├── SocialHub.tsx           # Main dashboard and router (289 lines)
├── SocialTimeline.tsx      # Unified timeline view (312 lines)
├── TimelinePost.tsx        # Individual post card (267 lines)
├── TimelineFilters.tsx     # Filter controls (198 lines)
├── SocialAccountList.tsx   # Account management list (234 lines)
├── AccountCard.tsx         # Individual account card (187 lines)
├── AddAccountModal.tsx     # Add account modal (256 lines)
├── SyncStatusPanel.tsx     # Sync status display (176 lines)
├── CategoryManager.tsx     # Category CRUD (298 lines)
├── SocialAnalytics.tsx     # Analytics dashboard (324 lines)
└── SocialSearch.tsx        # Full-text search UI (213 lines)
```

**Total:** ~2,750 lines of UI code

## Component Hierarchy

```
SocialHub (Main Container)
├── Header (Tabs: Timeline, Accounts, Categories, Analytics, Search)
├── SocialTimeline
│   ├── TimelineFilters
│   └── [TimelinePost] (list)
│       └── Post content, media, engagement
├── SocialAccountList
│   ├── AddAccountModal
│   └── [AccountCard] (list)
│       └── SyncStatusPanel
├── CategoryManager
│   └── Category CRUD operations
├── SocialAnalytics
│   └── Charts and statistics
└── SocialSearch
    └── [TimelinePost] (search results)
```

## Component Details

### 1. SocialHub.tsx
**Purpose:** Main container and navigation hub for the entire social media suite.

**Features:**
- Tab-based navigation (Timeline, Accounts, Categories, Analytics, Search)
- Responsive layout with Mantine AppShell
- Space-aware routing
- Global state management setup

**Props:**
```typescript
interface SocialHubProps {
  spaceId: string;
  onClose?: () => void;
}
```

**State Management:**
```typescript
const [activeTab, setActiveTab] = useState<'timeline' | 'accounts' | 'categories' | 'analytics' | 'search'>('timeline');
```

**Hooks Used:**
- `useState` - Tab state
- `useEffect` - Initialization

**Key Sections:**
```tsx
<Tabs value={activeTab} onChange={setActiveTab}>
  <Tabs.List>
    <Tabs.Tab value="timeline">Timeline</Tabs.Tab>
    <Tabs.Tab value="accounts">Accounts</Tabs.Tab>
    <Tabs.Tab value="categories">Categories</Tabs.Tab>
    <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
    <Tabs.Tab value="search">Search</Tabs.Tab>
  </Tabs.List>

  <Tabs.Panel value="timeline">
    <SocialTimeline spaceId={spaceId} />
  </Tabs.Panel>
  {/* Other panels... */}
</Tabs>
```

**Styling:**
- Uses Mantine theme
- Responsive breakpoints
- Consistent spacing

---

### 2. SocialTimeline.tsx
**Purpose:** Displays unified timeline of posts from all connected accounts.

**Features:**
- Infinite scroll with virtualization
- Real-time filtering
- Platform icons and colors
- Category badges
- Engagement metrics display
- Pull-to-refresh

**Props:**
```typescript
interface SocialTimelineProps {
  spaceId: string;
  initialFilters?: TimelineFilters;
}
```

**State Management:**
```typescript
const [filters, setFilters] = useState<TimelineFilters>({
  platforms: [],
  categories: [],
  startDate: null,
  endDate: null,
  searchQuery: '',
});

const { data: posts, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['timeline', spaceId, filters],
  queryFn: ({ pageParam = 0 }) => getUnifiedTimeline(spaceId, { ...filters, offset: pageParam }),
  getNextPageParam: (lastPage, pages) => {
    return lastPage.length === POSTS_PER_PAGE ? pages.length * POSTS_PER_PAGE : undefined;
  },
});
```

**Hooks Used:**
- `useInfiniteQuery` - Paginated timeline data
- `useIntersectionObserver` - Infinite scroll trigger
- `useState` - Filter state
- `useMemo` - Flattened posts array

**Key Features:**
```tsx
// Infinite scroll
useEffect(() => {
  const observer = new IntersectionObserver(
    entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    { threshold: 0.5 }
  );

  if (sentinelRef.current) {
    observer.observe(sentinelRef.current);
  }

  return () => observer.disconnect();
}, [hasNextPage, isFetchingNextPage, fetchNextPage]);
```

**Performance:**
- Virtualized list rendering
- Debounced filter updates
- Memoized post components
- Lazy image loading

---

### 3. TimelinePost.tsx
**Purpose:** Individual post card component with media, content, and engagement.

**Features:**
- Platform-specific styling
- Media gallery (images/videos)
- Expandable content (read more)
- Engagement metrics (likes, shares, comments)
- Category tags
- Timestamp formatting
- Link detection and rendering
- Copy post content
- Open original post

**Props:**
```typescript
interface TimelinePostProps {
  post: TimelinePost;
  onCategoryClick?: (categoryId: string) => void;
}

interface TimelinePost {
  id: string;
  platform: string;
  content: string;
  author: string;
  author_handle?: string;
  timestamp: number;
  media_urls: string[];
  engagement: {
    likes: number;
    shares: number;
    comments: number;
  };
  categories: Array<{ id: string; name: string; color: string }>;
  post_url?: string;
}
```

**State:**
```typescript
const [isExpanded, setIsExpanded] = useState(false);
const [showAllMedia, setShowAllMedia] = useState(false);
const [imageError, setImageError] = useState<Set<number>>(new Set());
```

**Platform Styling:**
```typescript
const platformColors: Record<string, string> = {
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  tiktok: '#000000',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  discord: '#5865F2',
  reddit: '#FF4500',
  // ... all 18 platforms
};

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  instagram: '📷',
  tiktok: '🎵',
  youtube: '▶️',
  // ... all 18 platforms
};
```

**Content Rendering:**
```tsx
// Link detection
const renderContent = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return <Anchor key={i} href={part} target="_blank">{part}</Anchor>;
    }
    return part;
  });
};

// Truncation
const displayContent = isExpanded || content.length <= MAX_CONTENT_LENGTH
  ? content
  : content.substring(0, MAX_CONTENT_LENGTH) + '...';
```

**Media Gallery:**
```tsx
<SimpleGrid cols={media_urls.length === 1 ? 1 : 2} spacing="xs">
  {visibleMedia.map((url, index) => (
    <Box key={index} sx={{ position: 'relative', paddingBottom: '56.25%' }}>
      {url.match(/\.(mp4|webm|mov)$/i) ? (
        <video src={url} controls style={{ position: 'absolute', width: '100%', height: '100%' }} />
      ) : (
        <Image
          src={url}
          alt={`Media ${index + 1}`}
          fit="cover"
          onError={() => handleImageError(index)}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
      )}
    </Box>
  ))}
</SimpleGrid>
```

**Engagement Display:**
```tsx
<Group spacing="md" mt="sm">
  <Text size="sm" color="dimmed">
    <IconHeart size={16} /> {formatNumber(engagement.likes)}
  </Text>
  <Text size="sm" color="dimmed">
    <IconShare size={16} /> {formatNumber(engagement.shares)}
  </Text>
  <Text size="sm" color="dimmed">
    <IconMessage size={16} /> {formatNumber(engagement.comments)}
  </Text>
</Group>
```

---

### 4. TimelineFilters.tsx
**Purpose:** Advanced filtering controls for timeline view.

**Features:**
- Multi-platform selection
- Category filtering
- Date range picker
- Search query input
- Quick preset filters (Today, This Week, This Month)
- Clear all filters

**Props:**
```typescript
interface TimelineFiltersProps {
  filters: TimelineFilters;
  onChange: (filters: TimelineFilters) => void;
  availablePlatforms: string[];
  availableCategories: Array<{ id: string; name: string; color: string }>;
}
```

**Components:**
```tsx
<Stack spacing="md">
  {/* Platform filter */}
  <MultiSelect
    label="Platforms"
    placeholder="All platforms"
    data={platformOptions}
    value={filters.platforms}
    onChange={platforms => onChange({ ...filters, platforms })}
    searchable
    clearable
  />

  {/* Category filter */}
  <MultiSelect
    label="Categories"
    placeholder="All categories"
    data={categoryOptions}
    value={filters.categories}
    onChange={categories => onChange({ ...filters, categories })}
    searchable
    clearable
  />

  {/* Date range */}
  <DateRangePicker
    label="Date range"
    placeholder="Pick dates"
    value={[filters.startDate, filters.endDate]}
    onChange={([start, end]) => onChange({ ...filters, startDate: start, endDate: end })}
    clearable
  />

  {/* Search */}
  <TextInput
    label="Search"
    placeholder="Search in posts..."
    value={filters.searchQuery}
    onChange={e => onChange({ ...filters, searchQuery: e.target.value })}
    icon={<IconSearch size={16} />}
  />

  {/* Quick presets */}
  <Group spacing="xs">
    <Button size="xs" variant="light" onClick={() => setPreset('today')}>Today</Button>
    <Button size="xs" variant="light" onClick={() => setPreset('week')}>This Week</Button>
    <Button size="xs" variant="light" onClick={() => setPreset('month')}>This Month</Button>
  </Group>

  {/* Clear */}
  <Button variant="subtle" onClick={() => onChange({})}>Clear All Filters</Button>
</Stack>
```

**Debouncing:**
```typescript
const debouncedOnChange = useMemo(
  () => debounce(onChange, 300),
  [onChange]
);
```

---

### 5. SocialAccountList.tsx
**Purpose:** Manage connected social media accounts.

**Features:**
- List all accounts with status
- Add new account button
- Enable/disable accounts
- Update sync frequency
- Delete accounts with confirmation
- Last sync time display
- Platform icons and colors

**Props:**
```typescript
interface SocialAccountListProps {
  spaceId: string;
}
```

**State:**
```typescript
const { data: accounts, isLoading, refetch } = useQuery({
  queryKey: ['socialAccounts', spaceId],
  queryFn: () => getSocialAccounts(spaceId),
});

const [addModalOpen, setAddModalOpen] = useState(false);
const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
```

**Mutations:**
```typescript
const updateMutation = useMutation({
  mutationFn: ({ accountId, enabled, syncFreq }: UpdateParams) =>
    updateSocialAccount(accountId, enabled, syncFreq),
  onSuccess: () => {
    refetch();
    showNotification({ title: 'Updated', message: 'Account updated successfully', color: 'green' });
  },
  onError: () => {
    showNotification({ title: 'Error', message: 'Failed to update account', color: 'red' });
  },
});

const deleteMutation = useMutation({
  mutationFn: (accountId: string) => deleteSocialAccount(accountId),
  onSuccess: () => {
    refetch();
    setDeleteConfirm(null);
    showNotification({ title: 'Deleted', message: 'Account deleted successfully', color: 'green' });
  },
});
```

**Rendering:**
```tsx
<Stack spacing="md">
  <Group position="apart">
    <Title order={2}>Connected Accounts</Title>
    <Button leftIcon={<IconPlus />} onClick={() => setAddModalOpen(true)}>
      Add Account
    </Button>
  </Group>

  {accounts?.map(account => (
    <AccountCard
      key={account.id}
      account={account}
      onUpdate={(enabled, syncFreq) => updateMutation.mutate({ accountId: account.id, enabled, syncFreq })}
      onDelete={() => setDeleteConfirm(account.id)}
    />
  ))}

  <AddAccountModal
    spaceId={spaceId}
    opened={addModalOpen}
    onClose={() => setAddModalOpen(false)}
    onSuccess={refetch}
  />

  {/* Delete confirmation modal */}
  <Modal opened={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}>
    <Text>Are you sure you want to delete this account?</Text>
    <Group position="right" mt="md">
      <Button variant="subtle" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
      <Button color="red" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}>
        Delete
      </Button>
    </Group>
  </Modal>
</Stack>
```

---

### 6. AccountCard.tsx
**Purpose:** Display and manage individual social media account.

**Features:**
- Platform badge with icon
- Username display
- Enable/disable toggle
- Sync frequency selector
- Last sync timestamp
- Sync status indicator
- Quick actions (sync now, delete)

**Props:**
```typescript
interface AccountCardProps {
  account: SocialAccount;
  onUpdate: (enabled: boolean, syncFreq: number) => void;
  onDelete: () => void;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  enabled: boolean;
  sync_frequency_minutes: number;
  last_sync: number | null;
  created_at: number;
}
```

**State:**
```typescript
const [enabled, setEnabled] = useState(account.enabled);
const [syncFreq, setSyncFreq] = useState(account.sync_frequency_minutes);
```

**Rendering:**
```tsx
<Card shadow="sm" padding="lg" radius="md" withBorder>
  <Group position="apart">
    {/* Platform badge */}
    <Badge color={platformColors[account.platform]} leftSection={platformIcons[account.platform]}>
      {account.platform.toUpperCase()}
    </Badge>

    {/* Enabled toggle */}
    <Switch
      checked={enabled}
      onChange={e => {
        setEnabled(e.currentTarget.checked);
        onUpdate(e.currentTarget.checked, syncFreq);
      }}
      label="Enabled"
    />
  </Group>

  <Text size="xl" weight={500} mt="md">@{account.username}</Text>

  {/* Sync frequency */}
  <Select
    label="Sync frequency"
    value={syncFreq.toString()}
    onChange={val => {
      const freq = parseInt(val || '60', 10);
      setSyncFreq(freq);
      onUpdate(enabled, freq);
    }}
    data={[
      { value: '15', label: 'Every 15 minutes' },
      { value: '30', label: 'Every 30 minutes' },
      { value: '60', label: 'Every hour' },
      { value: '360', label: 'Every 6 hours' },
      { value: '1440', label: 'Daily' },
    ]}
  />

  {/* Last sync */}
  {account.last_sync && (
    <Text size="sm" color="dimmed" mt="sm">
      Last synced: {formatRelativeTime(account.last_sync)}
    </Text>
  )}

  {/* Actions */}
  <Group position="apart" mt="md">
    <Button variant="light" size="xs">Sync Now</Button>
    <ActionIcon color="red" onClick={onDelete}>
      <IconTrash size={16} />
    </ActionIcon>
  </Group>
</Card>
```

---

### 7. AddAccountModal.tsx
**Purpose:** Modal for adding new social media accounts.

**Features:**
- Platform selection dropdown
- Username input with validation
- Credential input (encrypted)
- Sync frequency configuration
- Form validation
- Loading states
- Error handling

**Props:**
```typescript
interface AddAccountModalProps {
  spaceId: string;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**State:**
```typescript
const [platform, setPlatform] = useState('');
const [username, setUsername] = useState('');
const [credentials, setCredentials] = useState('');
const [syncFreq, setSyncFreq] = useState(60);
```

**Form Validation:**
```typescript
const isValid = platform && username.trim().length > 0 && credentials.trim().length > 0;
```

**Mutation:**
```typescript
const addMutation = useMutation({
  mutationFn: () => addSocialAccount(spaceId, platform, username, credentials, syncFreq),
  onSuccess: () => {
    showNotification({ title: 'Success', message: 'Account added successfully', color: 'green' });
    resetForm();
    onClose();
    onSuccess();
  },
  onError: (error: any) => {
    showNotification({ title: 'Error', message: error.message || 'Failed to add account', color: 'red' });
  },
});
```

**Rendering:**
```tsx
<Modal opened={opened} onClose={onClose} title="Add Social Media Account">
  <Stack spacing="md">
    <Select
      label="Platform"
      placeholder="Select platform"
      value={platform}
      onChange={val => setPlatform(val || '')}
      data={[
        { value: 'twitter', label: 'Twitter/X' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'youtube', label: 'YouTube' },
        // ... all 18 platforms
      ]}
      required
    />

    <TextInput
      label="Username"
      placeholder="your_username"
      value={username}
      onChange={e => setUsername(e.target.value)}
      required
    />

    <PasswordInput
      label="Credentials (Session Token)"
      placeholder="Your session token or API key"
      value={credentials}
      onChange={e => setCredentials(e.target.value)}
      required
      description="Encrypted and stored securely"
    />

    <Select
      label="Sync frequency"
      value={syncFreq.toString()}
      onChange={val => setSyncFreq(parseInt(val || '60', 10))}
      data={[
        { value: '15', label: 'Every 15 minutes' },
        { value: '30', label: 'Every 30 minutes' },
        { value: '60', label: 'Every hour' },
        { value: '360', label: 'Every 6 hours' },
        { value: '1440', label: 'Daily' },
      ]}
    />

    <Group position="right" mt="md">
      <Button variant="subtle" onClick={onClose}>Cancel</Button>
      <Button
        onClick={() => addMutation.mutate()}
        loading={addMutation.isLoading}
        disabled={!isValid}
      >
        Add Account
      </Button>
    </Group>
  </Stack>
</Modal>
```

---

### 8. SyncStatusPanel.tsx
**Purpose:** Display real-time sync status and history.

**Features:**
- Current sync progress
- Sync history table
- Status indicators (pending, in_progress, completed, failed)
- Error messages
- Post count per sync
- Duration display
- Refresh button

**Props:**
```typescript
interface SyncStatusPanelProps {
  accountId: string;
}
```

**State:**
```typescript
const { data: syncHistory, isLoading, refetch } = useQuery({
  queryKey: ['syncHistory', accountId],
  queryFn: () => getSyncHistory(accountId),
  refetchInterval: 5000, // Poll every 5 seconds
});
```

**Status Colors:**
```typescript
const statusColors: Record<string, string> = {
  pending: 'gray',
  in_progress: 'blue',
  completed: 'green',
  failed: 'red',
};
```

**Rendering:**
```tsx
<Card shadow="sm" padding="md">
  <Group position="apart" mb="md">
    <Title order={4}>Sync History</Title>
    <ActionIcon onClick={() => refetch()}>
      <IconRefresh size={16} />
    </ActionIcon>
  </Group>

  <Table>
    <thead>
      <tr>
        <th>Time</th>
        <th>Status</th>
        <th>Posts</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody>
      {syncHistory?.map(sync => (
        <tr key={sync.id}>
          <td>{formatTimestamp(sync.started_at)}</td>
          <td>
            <Badge color={statusColors[sync.status]}>
              {sync.status}
            </Badge>
          </td>
          <td>{sync.posts_fetched || 0}</td>
          <td>{sync.duration_ms ? `${sync.duration_ms}ms` : '-'}</td>
        </tr>
      ))}
    </tbody>
  </Table>

  {syncHistory?.some(s => s.status === 'failed') && (
    <Alert color="red" mt="md">
      <Text size="sm">{syncHistory.find(s => s.status === 'failed')?.error_message}</Text>
    </Alert>
  )}
</Card>
```

---

### 9. CategoryManager.tsx
**Purpose:** Create, update, and delete categories; assign posts to categories.

**Features:**
- Category list with colors and icons
- Create new category
- Edit category (name, color, icon)
- Delete category with confirmation
- Post count per category
- Drag-and-drop reordering
- Auto-categorization rule setup

**Props:**
```typescript
interface CategoryManagerProps {
  spaceId: string;
}
```

**State:**
```typescript
const { data: categories, refetch } = useQuery({
  queryKey: ['categories', spaceId],
  queryFn: () => getCategories(spaceId),
});

const [editingCategory, setEditingCategory] = useState<Category | null>(null);
const [newCategory, setNewCategory] = useState({ name: '', color: '#000000', icon: '' });
```

**Mutations:**
```typescript
const createMutation = useMutation({
  mutationFn: () => createCategory(spaceId, newCategory.name, newCategory.color, newCategory.icon),
  onSuccess: () => {
    refetch();
    setNewCategory({ name: '', color: '#000000', icon: '' });
    showNotification({ title: 'Created', color: 'green' });
  },
});

const updateMutation = useMutation({
  mutationFn: (category: Category) => updateCategory(category.id, category.name, category.color, category.icon),
  onSuccess: () => {
    refetch();
    setEditingCategory(null);
    showNotification({ title: 'Updated', color: 'green' });
  },
});

const deleteMutation = useMutation({
  mutationFn: (categoryId: string) => deleteCategory(categoryId),
  onSuccess: () => {
    refetch();
    showNotification({ title: 'Deleted', color: 'green' });
  },
});
```

**Rendering:**
```tsx
<Stack spacing="md">
  <Title order={2}>Categories</Title>

  {/* Create new */}
  <Card withBorder>
    <Stack spacing="sm">
      <TextInput
        placeholder="Category name"
        value={newCategory.name}
        onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
      />
      <Group>
        <ColorInput
          value={newCategory.color}
          onChange={color => setNewCategory({ ...newCategory, color })}
        />
        <TextInput
          placeholder="Icon (emoji)"
          value={newCategory.icon}
          onChange={e => setNewCategory({ ...newCategory, icon: e.target.value })}
          maxLength={2}
        />
        <Button onClick={() => createMutation.mutate()} disabled={!newCategory.name}>
          Create
        </Button>
      </Group>
    </Stack>
  </Card>

  {/* Category list */}
  {categories?.map(category => (
    <Card key={category.id} withBorder>
      <Group position="apart">
        <Group>
          <Text size="lg">{category.icon}</Text>
          <Badge color={category.color}>{category.name}</Badge>
          <Text size="sm" color="dimmed">({category.post_count} posts)</Text>
        </Group>
        <Group>
          <ActionIcon onClick={() => setEditingCategory(category)}>
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon color="red" onClick={() => deleteMutation.mutate(category.id)}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  ))}
</Stack>
```

---

### 10. SocialAnalytics.tsx
**Purpose:** Display analytics and insights about social media activity.

**Features:**
- Total post count by platform
- Engagement rate charts
- Time series activity graph
- Top posts by engagement
- Category performance
- Date range selector
- Export data button

**Props:**
```typescript
interface SocialAnalyticsProps {
  spaceId: string;
}
```

**State:**
```typescript
const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  new Date(),
]);

const { data: analytics, isLoading } = useQuery({
  queryKey: ['analytics', spaceId, dateRange],
  queryFn: () => getAnalyticsOverview(spaceId, 30),
});
```

**Charts:**
```tsx
{/* Platform breakdown */}
<Card>
  <Title order={4}>Posts by Platform</Title>
  <BarChart
    data={analytics?.platform_stats.map(p => ({
      platform: p.platform,
      posts: p.total_posts,
      engagement: p.avg_engagement,
    }))}
    xField="platform"
    yField="posts"
  />
</Card>

{/* Time series */}
<Card>
  <Title order={4}>Activity Over Time</Title>
  <LineChart
    data={analytics?.time_series}
    xField="date"
    yField="post_count"
  />
</Card>

{/* Top posts */}
<Card>
  <Title order={4}>Top Posts by Engagement</Title>
  <Stack>
    {analytics?.top_posts.map(post => (
      <TimelinePost key={post.id} post={post} />
    ))}
  </Stack>
</Card>
```

---

### 11. SocialSearch.tsx
**Purpose:** Full-text search across all posts with advanced filters.

**Features:**
- Real-time search with debouncing
- FTS5 full-text search
- Highlight matches in results
- Filter by platform/category
- Sort by relevance or date
- Search suggestions
- Recent searches

**Props:**
```typescript
interface SocialSearchProps {
  spaceId: string;
}
```

**State:**
```typescript
const [query, setQuery] = useState('');
const [filters, setFilters] = useState<SearchFilters>({});
const [sortBy, setSortBy] = useState<'relevance' | 'date'>('relevance');

const debouncedQuery = useDebounce(query, 300);

const { data: results, isLoading } = useQuery({
  queryKey: ['search', spaceId, debouncedQuery, filters, sortBy],
  queryFn: () => searchSocialPosts(spaceId, debouncedQuery, filters),
  enabled: debouncedQuery.length >= 3,
});
```

**Rendering:**
```tsx
<Stack spacing="md">
  <TextInput
    placeholder="Search posts..."
    value={query}
    onChange={e => setQuery(e.target.value)}
    icon={<IconSearch size={16} />}
    size="lg"
    rightSection={isLoading && <Loader size="xs" />}
  />

  <Group>
    <Select
      placeholder="Platform"
      data={platformOptions}
      onChange={val => setFilters({ ...filters, platform: val })}
      clearable
    />
    <Select
      placeholder="Sort by"
      value={sortBy}
      onChange={val => setSortBy(val as 'relevance' | 'date')}
      data={[
        { value: 'relevance', label: 'Relevance' },
        { value: 'date', label: 'Most Recent' },
      ]}
    />
  </Group>

  {results && results.length > 0 ? (
    <Stack>
      {results.map(post => (
        <TimelinePost key={post.id} post={post} highlightQuery={debouncedQuery} />
      ))}
    </Stack>
  ) : debouncedQuery.length >= 3 ? (
    <Text color="dimmed" align="center">No results found</Text>
  ) : (
    <Text color="dimmed" align="center">Enter at least 3 characters to search</Text>
  )}
</Stack>
```

---

## State Management

### React Query Setup
```typescript
// In App.tsx or root
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### Query Keys
```typescript
['timeline', spaceId, filters]           // Timeline posts
['socialAccounts', spaceId]              // Account list
['categories', spaceId]                  // Categories
['analytics', spaceId, dateRange]        // Analytics
['search', spaceId, query, filters]      // Search results
['syncHistory', accountId]               // Sync status
```

---

## Styling and Theming

### Mantine Theme
```typescript
<MantineProvider theme={{
  colorScheme: 'light',
  primaryColor: 'blue',
  fontFamily: 'Inter, sans-serif',
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { xs: 2, sm: 4, md: 8, lg: 16, xl: 32 },
}}>
```

### Platform Colors
```typescript
export const platformColors: Record<string, string> = {
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  tiktok: '#000000',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  discord: '#5865F2',
  reddit: '#FF4500',
  spotify: '#1DB954',
  pinterest: '#E60023',
  facebook: '#1877F2',
  threads: '#000000',
  bluesky: '#1185FE',
  mastodon: '#6364FF',
  snapchat: '#FFFC00',
  telegram: '#0088CC',
  gmail: '#EA4335',
  tinder: '#FE3C72',
  bumble: '#FFD700',
  hinge: '#FF1744',
  castbox: '#FF5A00',
};
```

---

## Performance Optimizations

### 1. Virtualization
```typescript
import { useVirtual } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);

const rowVirtualizer = useVirtual({
  size: posts.length,
  parentRef,
  estimateSize: useCallback(() => 300, []),
  overscan: 5,
});
```

### 2. Memoization
```typescript
const flatPosts = useMemo(
  () => data?.pages.flatMap(page => page) || [],
  [data]
);

const filteredPosts = useMemo(
  () => flatPosts.filter(post => matchesFilters(post, filters)),
  [flatPosts, filters]
);
```

### 3. Debouncing
```typescript
const debouncedSearch = useMemo(
  () => debounce((query: string) => setSearchQuery(query), 300),
  []
);
```

### 4. Lazy Loading
```typescript
const LazyAnalytics = lazy(() => import('./SocialAnalytics'));

<Suspense fallback={<Loader />}>
  <LazyAnalytics spaceId={spaceId} />
</Suspense>
```

---

## Error Handling

### Query Errors
```typescript
const { data, error, isError } = useQuery({
  queryKey: ['timeline', spaceId],
  queryFn: () => getUnifiedTimeline(spaceId),
  onError: (err) => {
    showNotification({
      title: 'Error loading timeline',
      message: err.message,
      color: 'red',
    });
  },
});

if (isError) {
  return <Alert color="red">{error.message}</Alert>;
}
```

### Mutation Errors
```typescript
const mutation = useMutation({
  mutationFn: addSocialAccount,
  onError: (error: any) => {
    if (error.message.includes('duplicate')) {
      showNotification({ title: 'Account already exists', color: 'yellow' });
    } else {
      showNotification({ title: 'Failed to add account', color: 'red' });
    }
  },
});
```

---

## Accessibility

All components follow accessibility best practices:

- **ARIA labels** on interactive elements
- **Keyboard navigation** support
- **Focus management** in modals
- **Screen reader** friendly
- **Color contrast** meets WCAG AA
- **Focus indicators** visible
- **Alt text** on images

---

## Testing

### Unit Tests
```typescript
// TimelinePost.test.tsx
describe('TimelinePost', () => {
  it('renders post content', () => {
    render(<TimelinePost post={mockPost} />);
    expect(screen.getByText(mockPost.content)).toBeInTheDocument();
  });

  it('displays engagement metrics', () => {
    render(<TimelinePost post={mockPost} />);
    expect(screen.getByText(/likes/i)).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
// SocialTimeline.test.tsx
describe('SocialTimeline', () => {
  it('loads and displays posts', async () => {
    render(<SocialTimeline spaceId="test" />);
    await waitFor(() => {
      expect(screen.getAllByTestId('timeline-post')).toHaveLength(10);
    });
  });

  it('applies filters correctly', async () => {
    render(<SocialTimeline spaceId="test" />);
    // Apply filter
    await userEvent.click(screen.getByText('Twitter'));
    // Check filtered results
    await waitFor(() => {
      expect(screen.getAllByTestId('timeline-post')).toHaveLength(5);
    });
  });
});
```

---

## Common Patterns

### Loading States
```tsx
if (isLoading) {
  return <Loader />;
}
```

### Empty States
```tsx
if (!data || data.length === 0) {
  return <Text color="dimmed">No posts yet</Text>;
}
```

### Error States
```tsx
if (isError) {
  return <Alert color="red">{error.message}</Alert>;
}
```

---

## Contributing

### Adding New Components
1. Create `.tsx` file in `components/social/`
2. Define Props interface
3. Use TypeScript strict mode
4. Follow naming conventions
5. Add to exports in `index.ts`
6. Write tests
7. Update this README

### Code Style
- Use functional components with hooks
- TypeScript strict mode
- Mantine components for UI
- React Query for data fetching
- Proper error handling
- Accessibility compliance

---

## License

See main project LICENSE file.

---

*For backend API, see `apps/desktop/src/services/socialApi.ts`*
*For core logic, see `packages/core-rs/src/social/`*
*For extractors, see `apps/desktop/src-tauri/js/extractors/`*
