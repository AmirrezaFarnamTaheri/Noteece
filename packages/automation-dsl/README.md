# Noteece Automation DSL

A Domain-Specific Language for automating workflows in Noteece.

## Overview

The Automation DSL allows you to write declarative automation scripts that respond to events and perform actions within Noteece. It provides a simple, readable syntax for creating powerful workflows without writing complex code.

## Features

- **Event-driven triggers**: Respond to note creation, updates, task completion, and more
- **Conditional execution**: Execute actions only when conditions are met
- **Built-in functions**: String manipulation, date handling, and more
- **Type-safe**: Full TypeScript support with comprehensive type definitions
- **Extensible**: Easy to add custom functions and actions

## Installation

```bash
pnpm add @noteece/automation-dsl
```

## Quick Start

```typescript
import { runAutomation, createMockNoteeceAPI } from '@noteece/automation-dsl';

const script = `
TRIGGER ON NoteCreated
WHEN tag == "urgent"
DO {
  CreateNote(title: "Follow-up", content: "Check urgent note")
  SendNotification(title: "Urgent Note", body: "New urgent note created")
}
`;

const api = createMockNoteeceAPI(); // Replace with real Noteece API
await runAutomation(script, api);
```

## Syntax

### Triggers

Triggers define when automation should run:

```
TRIGGER ON <event>
WHEN <condition>
DO {
  <actions>
}
```

#### Available Events

- `NoteCreated` - When a new note is created
- `NoteUpdated` - When a note is updated
- `NoteDeleted` - When a note is deleted
- `TaskCompleted` - When a task is marked complete
- `TagAdded` - When a tag is added to a note
- `Schedule(cron)` - Run on a schedule (cron syntax)
- `Manual` - Run manually only

### Actions

Actions perform operations in Noteece:

```
CreateNote(title: "Title", content: "Content", tags: ["tag1", "tag2"])
UpdateNote(id: "note_id", updates: {...})
DeleteNote(id: "note_id")
CreateTask(title: "Task", dueDate: "2024-12-31")
CompleteTask(id: "task_id")
AddTag(noteId: "note_id", tag: "important")
RemoveTag(noteId: "note_id", tag: "old")
SendNotification(title: "Title", body: "Message")
Log(message: "Debug info")
Wait(ms: 1000)
```

### Expressions

The DSL supports standard expressions:

- **Arithmetic**: `+`, `-`, `*`, `/`, `%`
- **Comparison**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Logical**: `&&`, `||`
- **Functions**: `concat()`, `upper()`, `lower()`, `now()`, `date()`

### Examples

#### Auto-categorize notes by tags

```
TRIGGER ON TagAdded
WHEN tag == "work"
DO {
  AddTag(noteId: noteId, tag: "professional")
  Log(message: "Auto-categorized work note")
}
```

#### Daily summary notification

```
TRIGGER ON Schedule("0 9 * * *")
DO {
  SendNotification(
    title: "Daily Summary",
    body: "Check your notes for today"
  )
}
```

#### Follow-up task creation

```
TRIGGER ON TaskCompleted
DO {
  CreateNote(
    title: concat("Completed: ", taskTitle),
    content: concat("Task completed on ", now())
  )
}
```

## API Reference

### `runAutomation(script: string, noteeceAPI: NoteeceAPI): Promise<void>`

Parse and execute an automation script.

### `parseAutomation(script: string): ProgramNode`

Parse a script into an AST without executing it.

### `AutomationParser`

Parser class for converting automation scripts into AST.

### `AutomationRuntimeImpl`

Runtime executor for automation scripts.

### `createMockNoteeceAPI(): NoteeceAPI`

Create a mock API implementation for testing.

## Architecture

The DSL consists of three main components:

1. **Parser** (`parser.ts`): Tokenizes and parses scripts into an Abstract Syntax Tree (AST)
2. **Runtime** (`runtime.ts`): Executes the AST and manages trigger registration
3. **Types** (`types.ts`): Type definitions for the AST and runtime

## Development

```bash
# Build
pnpm run build

# Watch mode
pnpm run dev

# Run tests
pnpm run test

# Lint
pnpm run lint
```

## Error Handling

The DSL provides specific error types:

- `ParseError`: Thrown when script syntax is invalid
- `RuntimeError`: Thrown when execution fails
- `AutomationError`: Base error class

```typescript
import { runAutomation, ParseError, RuntimeError } from '@noteece/automation-dsl';

try {
  await runAutomation(script, api);
} catch (error) {
  if (error instanceof ParseError) {
    console.error('Syntax error:', error.message);
  } else if (error instanceof RuntimeError) {
    console.error('Execution error:', error.message);
  }
}
```

## Contributing

Contributions are welcome! Please see the main Noteece repository for contribution guidelines.

## License

GPL-3.0 - See LICENSE file for details
