import { Command } from 'commander';
import chalk from 'chalk';
import { readConfig } from '../utils/config';
import { readTaskFile } from '../utils/fs';
import { AstValidator, NodeValidationResult } from '../validators/ast-validator';
import { CodeTask, Step, StepStatus } from '../types';

/**
 * spec validate 命令实现
 * 验证 CODE_TASK 中所有 Step 的 AST Nodes
 */
export const validateCommand = new Command('validate')
  .description('验证 CODE_TASK 中的 AST Nodes')
  .option('-v, --verbose', '显示详细错误信息')
  .action(async (options) => {
    try {
      // 读取当前任务
      const config = await readConfig();
      if (!config?.currentSpecPath) {
        throw new Error('No current task is set');
      }

      const task = await readTaskFile(config.currentSpecPath);

      // 创建验证器
      const validator = new AstValidator(task.metadata.repoName);

      console.log('Validating AST nodes...');

      // 执行验证
      const summary = await validateAllSteps(task, validator);

      // 显示结果
      displayValidationResults(summary.results, options.verbose);
      displayValidationSummary(summary);

    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      } else {
        console.error(chalk.red('Unknown error occurred'));
      }
      process.exit(1);
    }
  });

/**
 * 验证所有 Steps
 */
async function validateAllSteps(
  task: CodeTask,
  validator: AstValidator
): Promise<{
  totalSteps: number;
  validSteps: number;
  needAstNodeSteps: number;
  invalidSteps: number;
  results: StepValidationResult[];
}> {
  const allResults: StepValidationResult[] = [];
  let needAstNodeCount = 0;

  for (const e2eTask of task.e2eTasks) {
    if (e2eTask.index === 'start' || e2eTask.index === 'end') continue;

    // 检查 E2E 是否有实际的 Step
    const realSteps = e2eTask.steps.filter(
      (s) => s.index !== 'start' && s.index !== 'end'
    );

    if (realSteps.length === 0) {
      // E2E 没有 Step，添加验证错误
      allResults.push({
        e2eIndex: e2eTask.index as number,
        e2eName: e2eTask.name,
        stepIndex: 0,
        stepName: '',
        action: '',
        status: StepStatus.PENDING,
        valid: false,
        message: `E2E "${e2eTask.name}" 没有任何 Step，validate 不通过`
      });
      continue;
    }

    for (const step of e2eTask.steps) {
      if (step.index === 'start' || step.index === 'end') continue;

      const result = await validateStep(step, validator);
      // 添加 e2eIndex 信息
      result.e2eIndex = e2eTask.index as number;
      allResults.push(result);

      if (step.status === StepStatus.NEED_AST_NODE) {
        needAstNodeCount++;
      }
    }
  }

  const invalidSteps = allResults.filter(r => !r.valid).length;
  const validSteps = allResults.length - invalidSteps - needAstNodeCount;

  return {
    totalSteps: allResults.length,
    validSteps,
    needAstNodeSteps: needAstNodeCount,
    invalidSteps,
    results: allResults
  };
}

/**
 * 验证单个 Step
 */
async function validateStep(
  step: Step,
  validator: AstValidator
): Promise<StepValidationResult> {
  const result: StepValidationResult = {
    stepIndex: typeof step.index === 'number' ? step.index : 0,
    stepName: step.name,
    action: step.action,
    status: step.status || StepStatus.PENDING,
    valid: true
  };

  // 检查是否需要 AST Node
  if (step.status === StepStatus.NEED_AST_NODE) {
    result.valid = false;
    result.needAstNode = true;
    result.message = 'Missing stepNode';
    return result;
  }

  // 验证 stepNode（action=modify 时）
  if (step.action === 'modify' && step.stepNode) {
    // stepNode 应该是数组，但也要处理向后兼容
    const stepNodeArray = Array.isArray(step.stepNode) ? step.stepNode : [step.stepNode];
    const stepNodesResults: NodeValidationResult[] = [];

    for (const node of stepNodeArray) {
      const nodeResult = await validator.validateNode(node);
      stepNodesResults.push(nodeResult);

      if (!nodeResult.valid) {
        result.valid = false;
        result.stepNodeInvalid = true;
        result.stepNodeError = nodeResult.error;
      }
    }
  }

  // 验证 relatedNodes
  if (step.relatedNodes && step.relatedNodes.length > 0) {
    const relatedNodesResults: NodeValidationResult[] = [];

    for (const nodeStr of step.relatedNodes) {
      try {
        const node = typeof nodeStr === 'string' ? JSON.parse(nodeStr) : nodeStr;
        const nodeResult = await validator.validateNode(node);
        relatedNodesResults.push(nodeResult);
      } catch {
        // JSON 解析失败，创建一个错误结果
        relatedNodesResults.push({
          valid: false,
          error: `Invalid node format: ${nodeStr}`
        });
      }
    }

    result.relatedNodesResults = relatedNodesResults;

    const hasInvalid = relatedNodesResults.some(r => !r.valid);
    if (hasInvalid) {
      result.valid = false;
    }
  }

  return result;
}

/**
 * 显示验证结果
 */
function displayValidationResults(
  results: StepValidationResult[],
  verbose: boolean
): void {
  let currentE2eIndex = 0;
  let e2eTaskName = '';

  for (const result of results) {
    // 简化处理：假设按顺序排列
    const icon = result.valid ? chalk.green('✓') :
                 result.needAstNode ? chalk.yellow('⚠') :
                 chalk.red('✗');

    // 处理 E2E 无 Step 的特殊情况
    if (result.message && result.stepName === '') {
      console.log(`  ${icon} [E2E ${result.e2eIndex}] ${result.e2eName}`);
      console.log(chalk.red(`    ✗ ${result.message}`));
      continue;
    }

    // 显示 [e2eIndex.stepIndex] 格式
    const indexLabel = result.e2eIndex ? `${result.e2eIndex}.${result.stepIndex}` : `${result.stepIndex}`;
    console.log(`  ${icon} [${indexLabel}] ${result.stepName} (${result.action})`);

    // 显示详细信息
    if (!result.valid || verbose) {
      // 显示 NEED_AST_NODE 状态
      if (result.needAstNode) {
        console.log(chalk.yellow(`    Status: ${StepStatus.NEED_AST_NODE}`));
        console.log(chalk.yellow(`    Missing stepNode (action=modify requires stepNode)`));
      }

      // 显示 stepNode 错误
      if (result.stepNodeInvalid && result.stepNodeError) {
        console.log(chalk.red(`    ✗ stepNode invalid: ${result.stepNodeError}`));
      }

      // 显示 relatedNodes 错误
      if (result.relatedNodesResults) {
        for (const nodeResult of result.relatedNodesResults) {
          if (!nodeResult.valid) {
            const nodeName = nodeResult.node?.name || 'unknown';
            console.log(chalk.red(
              `    ✗ relatedNode '${nodeName}': ${nodeResult.error}`
            ));
          } else if (verbose) {
            const nodeName = nodeResult.node?.name || 'unknown';
            console.log(chalk.green(`    ✓ relatedNode '${nodeName}'`));
          }
        }
      }
    }
  }
}

/**
 * 显示验证汇总
 */
function displayValidationSummary(summary: {
  totalSteps: number;
  validSteps: number;
  needAstNodeSteps: number;
  invalidSteps: number;
}): void {
  console.log('\n' + '─'.repeat(50));
  console.log(`Summary:`);
  console.log(`  Total steps: ${summary.totalSteps}`);
  console.log(`  ${chalk.green('✓ Valid')}: ${summary.validSteps}`);
  console.log(`  ${chalk.yellow('⚠ Need AST Node')}: ${summary.needAstNodeSteps}`);
  console.log(`  ${chalk.red('✗ Invalid')}: ${summary.invalidSteps}`);

  if (summary.invalidSteps === 0 && summary.needAstNodeSteps === 0) {
    console.log(chalk.green('\n✓ All AST nodes are valid!'));
  } else if (summary.invalidSteps === 0) {
    console.log(chalk.yellow('\n⚠ Some steps need AST Nodes'));
    console.log(chalk.yellow('  Update steps with: spec step update <e2e_index> <step_index> --step-node {...}'));
  } else {
    console.log(chalk.red('\n✗ Some AST nodes are invalid'));
    console.log(chalk.red('  Fix invalid nodes and run validate again'));
  }
}

/**
 * Step 验证结果
 */
interface StepValidationResult {
  e2eIndex?: number;
  e2eName?: string;
  stepIndex: number;
  stepName: string;
  action: string;
  status: StepStatus;
  valid: boolean;
  needAstNode?: boolean;
  message?: string;
  stepNodeInvalid?: boolean;
  stepNodeError?: string;
  relatedNodesResults?: NodeValidationResult[];
}
