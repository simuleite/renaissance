---
name: skill__spec__set
description: skill__spec__set `spec set <yyyy-mm-dd> <taskName>` [SET] Switch to existing CODE_SPEC.
---

Execute the spec set command to set an existing CODE_SPEC as current:

```bash
spec set <date> <taskName>
```

**Expected Output:**
- Configuration file updated with new task path
- Success message confirming task is now current

```
✓ Loaded CODE TASK: my-feature
Current CODE TASK: my-feature
```

**Parameters:**
- `date` (required): Task creation date in `yyyy-mm-dd` format
- `taskName` (required): Name of the task to set as current

```
{
  "description": "[SET] Switch to existing CODE_SPEC by date and task name. Validates date format, detects project, verifies task file exists, and updates current directory configuration. Supports both Go and TypeScript projects.",
  "inputSchema": {
    "$schema": "https://json-schema.org/draft-2020-12/schema",
    "properties": {
      "date": {
        "type": "string",
        "description": "Task creation date in yyyy-mm-dd format (required)",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
      },
      "taskName": {
        "type": "string",
        "description": "Name of the task to set as current (required)"
      }
    },
    "required": ["date", "taskName"],
    "additionalProperties": false,
    "type": "object"
  },
  "name": "spec_set"
}
```

**When to use:**
- Switch between different existing tasks
- Load a previously created task
- Change current task without creating new one
- Work on multiple tasks in the same project

**Example workflow:**
```bash
# Create first task
spec create user-authentication
# Add some E2E tasks...

# Create second task
spec create database-migration
# Add some E2E tasks...

# Switch back to first task
spec set 2025-01-10 user-authentication

# Continue working on first task
spec list

# Switch to second task again
spec set 2025-01-11 database-migration

# View second task
spec list
```

**Date Format Validation:**

The command validates the date format strictly:

| Format | Valid | Example |
|--------|-------|---------|
| `yyyy-mm-dd` | ✅ | `2025-01-11` |
| `yyyy-m-d` | ❌ | `2025-1-11` |
| `dd-mm-yyyy` | ❌ | `11-01-2025` |
| `mm/dd/yyyy` | ❌ | `01/11/2025` |

**Related Commands:**
- `spec create` - Create new CODE_SPEC
- `spec list` - Display current CODE_SPEC (use to verify)
- `spec e2e update` - Update E2E tasks (after setting)
- `spec step update` - Update step tasks (after setting)

