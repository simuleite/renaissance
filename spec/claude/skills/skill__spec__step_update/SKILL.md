---
name: skill__spec__step_update
description: skill__spec__step_update `spec step update` [STEP] Create, update, or delete steps within E2E test tasks.
---

Manage steps within E2E test tasks:

```bash
spec step update <e2e_index> <step_index> [name] [file_path] [action]
```

**Usage:**
```bash
# Create step (smart insert - auto-selects next available index)
spec step update 1 1 "创建Redis客户端" "clients/redis.go" "create"

# Update existing step - Full params (all fields)
spec step update 1 1 "更新后的名称" "clients/redis_v2.go" "modify" --step-node '{"modPath":"...","pkgPath":"...","name":"..."}'

# Update existing step - Partial params (only specific fields)
spec step update 1 1 "新名称"  # 仅更新名称
spec step update 1 1 "" "" "" --step-node '{"modPath":"..."}'  # 仅更新 stepNode
spec step update 1 1 "" "" "" --additional-info "更新信息"  # 仅更新附加信息

# Prepend step (insert at the beginning)
spec step update 1 "" "新步骤" "file.go" "create" --prepend

# Mark as completed
spec step update 1 1 --complete

# Delete step
spec step update 1 1 --delete

# Batch create from JSON
spec step update 1 batch steps.json
```

**Smart Mode:**
- **Existing step**: Updates with any combination of parameters (name/file_path/action/step-node/related-nodes/additional-info all optional)
- **New step**: Automatically inserts at next available position, requires name, file_path, and action

**Options:**
- `--delete`: Delete step
- `--insert`: Insert after specified position
- `--prepend`: Insert at the beginning
- `--complete`: Mark completed
- `--uncomplete`: Mark uncompleted
- `--batch <file>`: Batch create from JSON
- `--step-node <json>`: AST node for modify action
- `--related-nodes <json>`: Related node IDs
- `--additional-info <text>`: Additional info

**Output:**
```
✓ Step status updated: need_ast_node → pending
✓ Updated: [1.1] 步骤名称
✓ Inserted: [1.2] 步骤名称
✓ Prepended: [1.1] 步骤名称
→ Next: [1.2] 步骤名称
✓ Deleted: [1.1] 步骤名称
✓ Completed: [1.1] 步骤名称
```

**JSON Schema:**
```json
{
  "description": "Create, update, or delete steps within E2E tasks",
  "inputSchema": {
    "properties": {
      "e2e_index": {"type": "string", "description": "Parent E2E task index"},
      "step_index": {"type": "string", "description": "Step index"},
      "name": {"type": "string", "description": "Step name"},
      "file_path": {"type": "string", "description": "Target file"},
      "action": {"type": "string", "description": "Action: create/modify/delete"},
      "delete": {"type": "boolean"},
      "insert": {"type": "boolean"},
      "prepend": {"type": "boolean"},
      "complete": {"type": "boolean"},
      "uncomplete": {"type": "boolean"},
      "batch": {"type": "string"},
      "step_node": {"type": "string"},
      "related_nodes": {"type": "string"},
      "additional_info": {"type": "string"}
    },
    "required": ["e2e_index", "step_index", "name", "file_path", "action"],
    "type": "object"
  }
}
```

**Related:**
- `spec create` - Create CODE_SPEC
- `spec set` - Set current task
- `spec e2e update` - Manage E2E tasks
