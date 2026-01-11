---
name: skill__spec__create
description: skill__spec__create `spec create` [CREATE] Create new CODE_TASK.
---

Execute the spec create command to create a new CODE_TASK:

```bash
spec create <taskName> [options]
```

**Expected Output:**
- New CODE_TASK JSON file created
- Success message with task details

```
✓ Created CODE TASK: my-feature
Current CODE TASK: my-feature
```

**Parameters:**
- `taskName` (required): Name of the task to create

**Options:**
- `-d, --description <description>`: Optional task description

```
{
  "description": "[CREATE] Create new CODE_TASK.",
  "inputSchema": {
    "$schema": "https://json-schema.org/draft-2020-12/schema",
    "properties": {
      "taskName": {
        "type": "string",
        "description": "Name of the task to create (required)"
      },
      "description": {
        "type": "string",
        "description": "Optional task description"
      }
    },
    "required": ["taskName"],
    "additionalProperties": false,
    "type": "object"
  },
  "name": "spec_create"
}
```

**When to use:**
- Start a new development task or feature
- Initialize a new CODE_TASK for tracking
- Begin a new E2E testing workflow
- Create a new task with automatic project setup

**Example workflow:**
```bash
# Create a new task with minimal information
spec create user-authentication
# or Create a new task with description
spec create database-migration -d "Migrate user data to new schema"

# Add E2E tasks to your new task
spec e2e update batch tasks.json

# After creation, the task is automatically set as current
spec list  # Shows the newly created task
```

**Related Commands:**
- `spec set` - Set existing CODE_TASK as current
- `spec list` - Display current CODE_TASK
- `spec e2e update` - Add/update E2E tasks
- `spec step update` - Add/update step tasks
