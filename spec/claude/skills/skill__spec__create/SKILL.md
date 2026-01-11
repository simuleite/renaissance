---
name: skill__spec__create
description: skill__spec__create `spec create` [CREATE] Create new CODE_SPEC.
---

Execute the spec create command to create a new CODE_SPEC:

```bash
spec create <taskName> [options]
```

**Expected Output:**
- New CODE_SPEC JSON file created
- Current working directory configuration updated
- Success message with task details

```
✓ Created CODE TASK: my-feature
Current CODE TASK: my-feature
Repository: github.com/user/myapp
```

**Parameters:**
- `taskName` (required): Name of the task to create

**Options:**
- `-d, --description <description>`: Optional task description

```
{
  "description": "[CREATE] Create new CODE_SPEC.",
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
- Initialize a new CODE_SPEC for tracking
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
- `spec set` - Set existing CODE_SPEC as current
- `spec list` - Display current CODE_SPEC
- `spec e2e update` - Add/update E2E tasks
- `spec step update` - Add/update step tasks
