---
name: skill__spec__list
description: skill__spec__list `spec list` [LIST] Display current CODE_SPEC with formatted tree structure showing E2E tasks and steps with completion status.
---

Execute the spec list command to display the current CODE_SPEC:

```bash
spec list
```

**Expected Output:**
- Formatted tree structure of E2E tasks and steps
- Completion status indicators (✓ for completed, [ ] for pending)
- File path and action information for each step

```
1. ✓ 实现用户认证功能（已完成）
    1.1 ✓ 创建AuthController
        - file_path: controllers/auth_controller.go
        - action: create
2. [ ] 实现数据库连接
    2.1 [ ] 配置Redis客户端
        - file_path: clients/redis_client.go
        - action: create
        - additional_info: 使用go-redis v9
    2.2 [ ] 实现连接池管理
        - file_path: clients/pool_manager.go
        - action: create
```

**Parameters:**
- None (this command takes no parameters)

```
{
  "description": "[LIST] Display current CODE_SPEC with formatted tree structure showing E2E tasks and steps with completion status. Automatically filters start/end nodes and displays metadata.",
  "inputSchema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "properties": {},
    "additionalProperties": false,
    "type": "object"
  },
  "name": "spec_list"
}
```

**When to use:**
- View current CODE_SPEC structure
- Check completion status of tasks
- Review E2E task and step hierarchy
- Verify task file content before updates
- Get overview of project progress

**Example workflow:**
```bash
# Create a new CODE_SPEC
spec create my-feature

# List the task (shows empty structure)
spec list

# Add E2E tasks
spec e2e update batch tasks.json

# List again to see structure
spec list

# Mark task as completed
spec e2e update 1 --complete

# List to see updated status
spec list
```

**Related Commands:**
- `spec create` - Create new CODE_SPEC
- `spec set` - Set current CODE_SPEC
- `spec e2e update` - Update E2E tasks
- `spec step update` - Update step tasks

