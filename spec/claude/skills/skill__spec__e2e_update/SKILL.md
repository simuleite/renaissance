---
name: skill__spec__e2e_update
description: skill__spec__e2e_update `spec e2e update` [E2E] Manage E2E tasks.
---

Create and manage E2E tasks:

```bash
spec e2e update <index> <name> <command> <expected>
```

**Examples:**
```bash
# Add new E2E task
spec e2e update 1 "创建用户认证" "curl POST /api/auth/login" "200 OK"

# Update existing task
spec e2e update 1 "用户登录" "curl -X POST /api/login" "token: xyz"

# Prepend task (insert at the beginning)
spec e2e update "" "新任务" "command" "output" --prepend

# Mark complete
spec e2e update 1 --complete

# Delete task
spec e2e update 1 --delete
```

**Parameters:**
- `index`: Task number
- `name`: Task name
- `command`: Test command
- `expected`: Expected result

**Options:**
- `--delete`: Remove task
- `--insert`: Insert after specified position
- `--prepend`: Insert at the beginning
- `--complete`: Mark done
- `--uncomplete`: Mark todo
- `--batch file.json`: Bulk import

**Output:**
```
✓ Updated: [1] 任务名
✓ Inserted: [2] 任务名
✓ Prepended: [1] 任务名
→ Next: [2] 任务名
✓ Deleted: [1] 任务名
```

**Schema:**
```json
{
  "description": "Manage E2E tasks",
  "inputSchema": {
    "properties": {
      "index": {"type": "string"},
      "name": {"type": "string"},
      "input": {"type": "string"},
      "output": {"type": "string"},
      "delete": {"type": "boolean"},
      "insert": {"type": "boolean"},
      "prepend": {"type": "boolean"},
      "complete": {"type": "boolean"},
      "batch": {"type": "string"}
    },
    "required": ["index", "name", "input", "output"],
    "type": "object"
  }
}
```

**Related:**
- `spec create` - New CODE_SPEC
- `spec set` - Switch task
- `spec step update` - Manage steps
