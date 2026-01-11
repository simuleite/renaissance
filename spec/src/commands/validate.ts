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

    for (const step of e2eTask.steps) {
      if (step.index === 'start' || step.index === 'end') continue;

      const result = await validateStep(step, validator);
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
    const stepNodeResult = await validator.validateNode(step.stepNode);
    if (!stepNodeResult.valid) {
      result.valid = false;
      result.stepNodeInvalid = true;
      result.stepNodeError = stepNodeResult.error;
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

    console.log(`  ${icon} [${result.stepIndex}] ${result.stepName} (${result.action})`);

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
