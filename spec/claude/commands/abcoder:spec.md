# 系统指令：使用 skill__spec 创建 CODE_SPEC

请使用 `skill__spec__create` 创建一个 CODE_SPEC。

## CODE_SPEC

```
CODE_SPEC
  └── E2E_TASK (0~N)
      ├── e2e_input: 具体可执行的验证命令
      ├── e2e_output: 预期的输出结果
      └── Steps (1~N)
          ├── action: modify|create|delete
          ├── stepNode: 相关AST Node；ABCoder get_ast_node 调用参数 (action=modify时)
          ├── relatedNodes: 相关节点数组
          └── file_path: 目标文件
```

## 创建步骤

1. **创建任务**: `spec create <taskName>`

2. **添加 E2E 任务**: `spec e2e update <index> <name> <input> <output>`
   - 定义端到端验收标准
   - input: 具体可执行的命令（如 curl、命令行工具）
   - output: 清晰的、可用于对比的预期结果

3. **拆分步骤**: `spec step update <e2e_index> <step_index> <name> <file_path> <action>`
   - Guardiant: 确保每个步骤更新范围为单个 node（原子性）
   - action=modify 时自动要求提供 stepNode（ABCoder get_ast_node 调用参数）

4. **验证任务**: `spec validate`
   - 检查 stepNode 和 relatedNodes 的有效性

5. **CODE_SEPC创建完成**: `spec list`

6. 提示用户文件已创建成功，停止操作
  - 告知用户这个CODE_SPEC是否包含外部依赖；如果包含，请清晰列出完整的外部依赖包名称

任务名称：{{1}}

如果用户没有提供任务名称，请提示用户使用格式：`/abcoder:spec <任务名称>`

---

## 核心设计理念

### E2E 验收标准
每个 E2E_TASK 必须有：
- **具体可执行的命令**: 如 `curl -X POST /api/login -d '{"user":"admin"}'`，`tool cli <args>`
- **清晰的预期结果**: 如 `200 OK {"token":"..."}`
- **可用于验证**: 结果必须可diff、可判断对错

### 原子化步骤
每个 Step 必须：
- **更新范围 单node**: 保证原子性，支持任意回退
- **action=modify 时提供 stepNode**: 通过 ABCoder get_ast_node 精确引用节点
- **完整的上下文**: relatedNodes、file_path、additional_info

### 软验证机制
- **NEED_AST_NODE 状态**: 缺少 stepNode 时不阻断工作流；但是需要补充 ABCoder get_ast_node 入参
- **渐进完善**: 先创建框架，后补齐细节
- **操作保护**: 不完整的步骤不能被错误执行

## 使用示例

```bash
# 1. 创建任务
spec create user-authentication

# 2. 添加 E2E 任务
spec e2e update 1 "登录接口验证" \
  "curl -X POST http://localhost:3000/api/login -d '{\"username\":\"admin\"}'" \
  "200 OK {\"token\":\"eyJ...\"}"

# 3. 拆分步骤
spec step update 1 1 "创建登录路由" "src/routes/auth.ts" "create"
spec step update 1 2 "实现认证逻辑" "src/middleware/auth.ts" "modify"

# 4. 查看进度
spec list
```

## 相关命令

- `spec create <taskName>` - 创建新任务
- `spec set <yyyy-mm-dd> <taskName>` - 切换任务
- `spec list` - 显示当前任务
- `spec e2e update` - 管理 E2E 任务
- `spec step update` - 管理步骤
- `spec validate` - 验证 AST Nodes
