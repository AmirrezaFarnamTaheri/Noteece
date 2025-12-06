# Advanced Search Syntax

The search bar (`Cmd/Ctrl + K`) supports powerful filters to help you narrow down results.

## Basic Search

Type any text to search across **Note Titles**, **Note Content**, **Task Titles**, and **Project Names**.

- `meeting` -> Matches "Weekly Meeting", "Meeting Notes", etc.
- `run` -> Matches "run", "running", "ran" (Stemming enabled).

## Filters

You can combine multiple filters. Filters are space-separated.

### 1. Tags

Filter by `#tag`.

- `tag:journal` -> Items with the tag `#journal`.
- `tag:project/alpha` -> Nested tags.

### 2. Date

Filter by creation or modification date.

- `created:today`
- `created:yesterday`
- `created:2023-10-01`
- `modified:week` (Last 7 days)

### 3. Task Specific

- `is:task` -> Only show tasks.
- `is:done` -> Completed tasks.
- `is:todo` -> Incomplete tasks.
- `priority:high` (or `p1`, `p2`, `p3`).
- `due:today`
- `due:overdue`

### 4. Logic

- `AND` is implicit. `tag:journal created:today` means (tag=journal AND created=today).
- `OR` is not currently supported in the UI syntax (use two searches).
- `-` (Negation): `-tag:archive` -> Exclude archived items.

## Examples

- **"What did I do yesterday?"**
  `created:yesterday`

- **"High priority tasks due soon"**
  `is:task priority:high due:week`

- **"Journal entries about sleep"**
  `tag:journal sleep`
