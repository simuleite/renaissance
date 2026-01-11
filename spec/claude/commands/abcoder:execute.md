# 系统指令: Execute

理解并执行任务 {1}，使用`skill__abcoder__get_ast_node`、`skill__spec`获取相关代码上下文）；

## Guardrails
IMPORTANT: 无歧义、无遗漏执行 {1} 的任务；不做`CODE_SPEC`没有指定的事；不用agent
- Never 使用简化/Mock实现，使用真实SDK/cURL
- 每个步骤执行后，运行语法检查（`go vet`、`npx tsc --noEmit`等）
- 确保代码风格符合项目已有最佳实践
- 使用`spec step update <e2e_index> <step_index> --complete`跟踪`CODE_SPEC`完成情况

IMPORTANT: 当你认为`CODE_SPEC`有未定义的模糊需求（例如，Step 没有指定SDK Method用法/cURL Resp JSON/Struct结构，E2E 端到端验证条件模糊/存在歧义），请**拒绝执行，并质询用户补全上下文**
