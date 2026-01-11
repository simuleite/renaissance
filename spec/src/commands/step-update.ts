import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import { readConfig } from '../utils/config';
import { readTaskFile } from '../utils/fs';
import { writeTaskFileAtomic } from '../utils/atomic-file';
import { StepStatus } from '../types';
import {
  formatStepUpdateSuccess,
  formatStepInsertSuccess,
  formatStepDeleteSuccess,
  formatStepCompletedSuccess,
  formatStepUncompletedSuccess,
  formatStepBatchCreateSuccess,
} from '../utils/format';
import { CodeTask, Step } from '../types';

/**
 * 检查 Step 状态，拦截对 NEED_AST_NODE 状态 Step 的非法操作
 */
function checkStepStatus(step: Step, operation: string, updates?: Partial<Step>): void {
  if (step.status === StepStatus.NEED_AST_NODE) {
    // 允许删除操作
    if (operation === 'delete') {
      return;
    }

    // 允许补齐 stepNode 的操作
    if (operation === 'update' && updates?.stepNode) {
      return;
    }

    // 拒绝其他操作
    throw new Error(
      `Cannot ${operation} step with status 'NEED_AST_NODE'\n` +
      `  Required action: Update stepNode first\n` +
      `  Hint: spec step update ${step.e2eIndex} ${step.index} ` +
      `--step-node '{"modPath":"...","pkgPath":"...","name":"..."}'`
    );
  }
}

/**
 * 基础 Step 更新逻辑
 */
async function updateStep(
  taskData: CodeTask,
  e2eIndex: number,
  stepIndex: number,
  updates: Partial<Step>
): Promise<void> {
  const e2eTaskIndex = taskData.e2eTasks.findIndex(
    (t) => t.index === e2eIndex
  );

  if (e2eTaskIndex === -1) {
    throw new Error(`E2E task with index ${e2eIndex} not found`);
  }

  const e2eTask = taskData.e2eTasks[e2eTaskIndex];
  const stepIndexInArray = e2eTask.steps.findIndex(
    (s) => s.index === stepIndex
  );

  if (stepIndexInArray === -1) {
    throw new Error(`Step with index ${stepIndex} not found in E2E task ${e2eIndex}`);
  }

  const step = e2eTask.steps[stepIndexInArray];

  if (step.index === 'start' || step.index === 'end') {
    throw new Error('Cannot update start or end node');
  }

  // 检查 Step 状态，拦截非法操作
  checkStepStatus(step, 'update', updates);

  // 更新字段
  if (updates.name !== undefined) step.name = updates.name;
  if (updates.filePath !== undefined) step.filePath = updates.filePath;
  if (updates.relatedNodes !== undefined) step.relatedNodes = updates.relatedNodes;
  if (updates.action !== undefined) step.action = updates.action;
  if (updates.stepNode !== undefined) {
    step.stepNode = updates.stepNode;
    // 如果补齐了 stepNode 且状态是 NEED_AST_NODE，则重置为 PENDING
    if (step.status === StepStatus.NEED_AST_NODE && step.stepNode) {
      step.status = StepStatus.PENDING;
      console.log(chalk.green(`✓ Step status updated: ${StepStatus.NEED_AST_NODE} → ${StepStatus.PENDING}`));
    }
  }
  if (updates.additionalInfo !== undefined) step.additionalInfo = updates.additionalInfo;

  e2eTask.steps[stepIndexInArray] = step;
}

/**
 * 插入 Step
 */
async function insertStep(
  taskData: CodeTask,
  e2eIndex: number,
  afterStepIndex: number,
  newStep: Partial<Step>
): Promise<void> {
  const e2eTaskIndex = taskData.e2eTasks.findIndex(
    (t) => t.index === e2eIndex
  );

  if (e2eTaskIndex === -1) {
    throw new Error(`E2E task with index ${e2eIndex} not found`);
  }

  const e2eTask = taskData.e2eTasks[e2eTaskIndex];

  // 如果 steps 数组为空，直接创建第一个 step
  if (e2eTask.steps.length === 0) {
    const newNode: Step = {
      e2eIndex: e2eIndex,
      index: 1,
      name: newStep.name!,
      filePath: newStep.filePath!,
      relatedNodes: newStep.relatedNodes || [],
      action: newStep.action!,
      completed: false,
      status: newStep.action === 'modify' && !newStep.stepNode
        ? StepStatus.NEED_AST_NODE
        : StepStatus.PENDING,
      stepNode: newStep.stepNode,
      additionalInfo: newStep.additionalInfo,
      prevStepIndex: 'start',
      nextStepIndex: 'end',
    };

    // 验证 action=modify 时是否提供 stepNode
    if (newStep.action === 'modify' && !newStep.stepNode) {
      console.warn(chalk.yellow(
        `\n⚠ Warning: Step created but missing required stepNode\n` +
        `  Status: ${StepStatus.NEED_AST_NODE}\n` +
        `  Hint: Update with: spec step update ${e2eIndex} 1 ` +
        `--step-node '{"modPath":"...","pkgPath":"...","name":"..."}'\n`
      ));
    }

    e2eTask.steps.push(newNode);
    return;
  }

  const afterStepIndexInArray = e2eTask.steps.findIndex(
    (s) => s.index === afterStepIndex
  );

  if (afterStepIndexInArray === -1) {
    throw new Error(`Step with index ${afterStepIndex} not found in E2E task ${e2eIndex}`);
  }

  const afterStep = e2eTask.steps[afterStepIndexInArray];

  if (afterStep.index === 'end') {
    throw new Error('Cannot insert after end node');
  }

  // 验证 action=modify 时是否提供 stepNode
  if (newStep.action === 'modify' && !newStep.stepNode) {
    // 软验证：设置 NEED_AST_NODE 状态并输出警告
    newStep.stepNode = undefined;
    console.warn(chalk.yellow(
      `\n⚠ Warning: Step created but missing required stepNode\n` +
      `  Status: ${StepStatus.NEED_AST_NODE}\n` +
      `  Hint: Update with: spec step update ${e2eIndex} ${afterStepIndex + 1} ` +
      `--step-node '{"modPath":"...","pkgPath":"...","name":"..."}'\n`
    ));
  }

  // 查找原 nextStep
  const nextIndex = afterStep.nextStepIndex;
  const nextStepIndexInArray = e2eTask.steps.findIndex(
    (s) => s.index === nextIndex
  );

  // 创建新节点
  const newIndex = afterStepIndex + 1;
  const newNode: Step = {
    e2eIndex: e2eIndex,
    index: newIndex,
    name: newStep.name!,
    filePath: newStep.filePath!,
    relatedNodes: newStep.relatedNodes || [],
    action: newStep.action!,
    completed: false,
    status: newStep.action === 'modify' && !newStep.stepNode
      ? StepStatus.NEED_AST_NODE
      : StepStatus.PENDING,
    stepNode: newStep.stepNode,
    additionalInfo: newStep.additionalInfo,
    prevStepIndex: afterStepIndex,
    nextStepIndex: nextIndex,
  };

  // 调整 afterStep 指针
  afterStep.nextStepIndex = newIndex;

  // 调整 nextStep 指针
  if (nextStepIndexInArray !== -1) {
    const nextStep = e2eTask.steps[nextStepIndexInArray];
    nextStep.prevStepIndex = newIndex;
  }

  // 后续节点 index +1
  e2eTask.steps
    .filter((s) => typeof s.index === 'number' && s.index > afterStepIndex)
    .forEach((s) => {
      s.index = (s.index as number) + 1;
      if (s.nextStepIndex !== 'end' && typeof s.nextStepIndex === 'number') {
        s.nextStepIndex = s.nextStepIndex + 1;
      }
      if (s.prevStepIndex !== 'start' && typeof s.prevStepIndex === 'number') {
        s.prevStepIndex = s.prevStepIndex + 1;
      }
    });

  // 插入新节点
  e2eTask.steps.push(newNode);
}

/**
 * 删除 Step
 */
async function deleteStep(
  taskData: CodeTask,
  e2eIndex: number,
  stepIndex: number
): Promise<{ name: string; newIndex: number }> {
  const e2eTaskIndex = taskData.e2eTasks.findIndex(
    (t) => t.index === e2eIndex
  );

  if (e2eTaskIndex === -1) {
    throw new Error(`E2E task with index ${e2eIndex} not found`);
  }

  const e2eTask = taskData.e2eTasks[e2eTaskIndex];
  const stepIndexInArray = e2eTask.steps.findIndex((s) => s.index === stepIndex);

  if (stepIndexInArray === -1) {
    throw new Error(`Step with index ${stepIndex} not found in E2E task ${e2eIndex}`);
  }

  const step = e2eTask.steps[stepIndexInArray];

  if (step.index === 'start' || step.index === 'end') {
    throw new Error('Cannot delete start or end node');
  }

  const name = step.name;
  const newIndex = step.index as number;

  // 调整 prevStep 指针
  if (step.prevStepIndex !== undefined && step.prevStepIndex !== 'start') {
    const prevStepIndexInArray = e2eTask.steps.findIndex(
      (s) => s.index === step.prevStepIndex
    );
    if (prevStepIndexInArray !== -1) {
      e2eTask.steps[prevStepIndexInArray].nextStepIndex = step.nextStepIndex;
    }
  }

  // 调整 nextStep 指针
  if (step.nextStepIndex !== undefined && step.nextStepIndex !== 'end') {
    const nextStepIndexInArray = e2eTask.steps.findIndex(
      (s) => s.index === step.nextStepIndex
    );
    if (nextStepIndexInArray !== -1) {
      e2eTask.steps[nextStepIndexInArray].prevStepIndex = step.prevStepIndex;
    }
  }

  // 删除节点
  e2eTask.steps.splice(stepIndexInArray, 1);

  // 后续节点 index -1
  e2eTask.steps
    .filter((s) => typeof s.index === 'number' && s.index > stepIndex)
    .forEach((s) => {
      s.index = (s.index as number) - 1;
      if (s.nextStepIndex !== 'end' && typeof s.nextStepIndex === 'number') {
        s.nextStepIndex = s.nextStepIndex - 1;
      }
      if (s.prevStepIndex !== 'start' && typeof s.prevStepIndex === 'number') {
        s.prevStepIndex = s.prevStepIndex - 1;
      }
    });

  return { name, newIndex };
}

/**
 * 更新 Step 完成状态
 */
async function updateStepStatus(
  taskData: CodeTask,
  e2eIndex: number,
  stepIndex: number,
  completed: boolean
): Promise<{ name: string }> {
  const e2eTaskIndex = taskData.e2eTasks.findIndex(
    (t) => t.index === e2eIndex
  );

  if (e2eTaskIndex === -1) {
    throw new Error(`E2E task with index ${e2eIndex} not found`);
  }

  const e2eTask = taskData.e2eTasks[e2eTaskIndex];
  const stepIndexInArray = e2eTask.steps.findIndex((s) => s.index === stepIndex);

  if (stepIndexInArray === -1) {
    throw new Error(`Step with index ${stepIndex} not found in E2E task ${e2eIndex}`);
  }

  const step = e2eTask.steps[stepIndexInArray];

  if (step.index === 'start' || step.index === 'end') {
    throw new Error('Cannot update start or end node');
  }

  step.completed = completed;

  return { name: step.name };
}

/**
 * 批量创建 Steps
 */
interface BatchStepInput {
  name: string;
  filePath: string;
  action: 'create' | 'modify' | 'delete';
  relatedNodes?: string[];
  stepNode?: {
    modPath: string;
    pkgPath: string;
    name: string;
  };
  additionalInfo?: string;
}

interface BatchStepsInput {
  steps: BatchStepInput[];
}

async function batchCreateSteps(
  taskData: CodeTask,
  e2eIndex: number,
  jsonFilePath: string
): Promise<{ count: number; names: string[] }> {
  // 读取 JSON 文件
  const expandedPath = jsonFilePath.replace('~', require('os').homedir());
  const batchData: BatchStepsInput = await fs.readJSON(expandedPath);

  // 验证格式
  if (!batchData.steps || !Array.isArray(batchData.steps)) {
    throw new Error('Invalid batch file format: missing steps array');
  }

  // 查找 E2E 任务
  const e2eTaskIndex = taskData.e2eTasks.findIndex(
    (t) => t.index === e2eIndex
  );

  if (e2eTaskIndex === -1) {
    throw new Error(`E2E task with index ${e2eIndex} not found`);
  }

  const e2eTask = taskData.e2eTasks[e2eTaskIndex];

  // 获取当前最大 index
  const maxIndex = Math.max(
    ...e2eTask.steps
      .filter((s) => typeof s.index === 'number')
      .map((s) => s.index as number),
    0
  );

  const names: string[] = [];
  const stepsToCreate = batchData.steps;

  // 查找原最后一个节点
  const lastStepIndex = e2eTask.steps.findIndex((s) => s.index === maxIndex);
  if (lastStepIndex !== -1) {
    const lastStep = e2eTask.steps[lastStepIndex];
    lastStep.nextStepIndex = maxIndex + 1;
  }

  // 创建新节点
  stepsToCreate.forEach((stepInput, i) => {
    const newIndex = maxIndex + 1 + i;
    names.push(stepInput.name);

    // 检查 action=modify 时是否提供 stepNode
    const needsAstNode = stepInput.action === 'modify' && !stepInput.stepNode;
    if (needsAstNode) {
      console.warn(chalk.yellow(
        `\n⚠ Warning: Step "${stepInput.name}" missing required stepNode\n` +
        `  Status: ${StepStatus.NEED_AST_NODE}\n` +
        `  Hint: Update with: spec step update ${e2eIndex} ${newIndex} ` +
        `--step-node '{"modPath":"...","pkgPath":"...","name":"..."}'\n`
      ));
    }

    const newNode: Step = {
      e2eIndex: e2eIndex,
      index: newIndex,
      name: stepInput.name,
      filePath: stepInput.filePath,
      relatedNodes: stepInput.relatedNodes || [],
      action: stepInput.action,
      completed: false,
      status: needsAstNode ? StepStatus.NEED_AST_NODE : StepStatus.PENDING,
      stepNode: stepInput.stepNode,
      additionalInfo: stepInput.additionalInfo,
      prevStepIndex: i === 0 ? maxIndex || 'start' : maxIndex + i,
      nextStepIndex: i === stepsToCreate.length - 1 ? 'end' : maxIndex + 2 + i,
    };

    e2eTask.steps.push(newNode);
  });

  return { count: stepsToCreate.length, names };
}

/**
 * Step Update 命令
 */
export const stepUpdateAction = new Command('update')
  .argument('<e2e_index>', 'E2E 任务索引')
  .argument('[step_index]', 'Step 索引')
  .argument('[name]', 'Step 名称')
  .argument('[file_path]', '文件路径')
  .argument('[action]', '动作类型 (create/modify/delete)')
  .option('-d, --delete', '删除指定 Step')
  .option('-i, --insert', '在指定位置后插入新 Step')
  .option('-c, --complete', '标记为已完成')
  .option('-u, --uncomplete', '标记为未完成')
  .option('-b, --batch <jsonFile>', '批量创建模式，指定 JSON 文件路径')
  .option('--related-nodes <json>', 'JSON 字符串格式的 relatedNodes 数组')
  .option('--step-node <json>', 'JSON 字符串格式的 stepNode 对象')
  .option('--additional-info <text>', '附加信息')
  .description('更新 Step')
  .action(
    async (
      e2eIndex: string,
      stepIndex: string,
      name: string,
      filePath: string,
      action: string,
      options
    ) => {
      try {
        const config = await readConfig();
        if (!config || !config.currentSpecPath) {
          throw new Error('No current CODE_TASK set. Use `spec set` first.');
        }

        const taskData = await readTaskFile(config.currentSpecPath);

        // 验证 e2e_index 参数
        if (!e2eIndex) {
          throw new Error('E2E index is required');
        }

        const numE2EIndex = parseInt(e2eIndex, 10);
        if (isNaN(numE2EIndex)) {
          throw new Error('Invalid E2E index format');
        }

        // 批量创建模式
        if (options.batch) {
          const result = await batchCreateSteps(taskData, numE2EIndex, options.batch);
          await writeTaskFileAtomic(config.currentSpecPath, taskData);
          console.log(formatStepBatchCreateSuccess(numE2EIndex, result.count, result.names));
          return;
        }

        // 验证 step_index 参数
        if (!stepIndex) {
          throw new Error('Step index is required');
        }

        const numStepIndex = parseInt(stepIndex, 10);
        if (isNaN(numStepIndex)) {
          throw new Error('Invalid step index format');
        }

        // 删除模式
        if (options.delete) {
          const result = await deleteStep(taskData, numE2EIndex, numStepIndex);
          await writeTaskFileAtomic(config.currentSpecPath, taskData);
          console.log(formatStepDeleteSuccess(numE2EIndex, result.newIndex, result.name));
          return;
        }

        // 完成状态切换
        if (options.complete || options.uncomplete) {
          const completed = options.complete ? true : false;
          const result = await updateStepStatus(taskData, numE2EIndex, numStepIndex, completed);
          await writeTaskFileAtomic(config.currentSpecPath, taskData);
          if (completed) {
            console.log(formatStepCompletedSuccess(numE2EIndex, numStepIndex, result.name));
          } else {
            console.log(formatStepUncompletedSuccess(numE2EIndex, numStepIndex, result.name));
          }
          return;
        }

        // 智能选择模式：检查 E2E task 是否存在
        const e2eTaskIndex = taskData.e2eTasks.findIndex(
          (t) => t.index === numE2EIndex
        );

        if (e2eTaskIndex === -1) {
          throw new Error(`E2E task with index ${numE2EIndex} not found`);
        }

        const e2eTask = taskData.e2eTasks[e2eTaskIndex];

        // 检查 step 是否存在
        const stepExists = e2eTask.steps.some((s) => s.index === numStepIndex);

        // 如果 step 不存在（插入模式），需要完整参数
        if (!stepExists && !name && !filePath && !action) {
          throw new Error(
            'Name, file_path, and action are required for insert mode'
          );
        }

        // 如果 step 存在（更新模式），允许部分参数
        if (stepExists && (!name || !filePath || !action)) {
          // 解析可选参数（即使没有提供 name/filePath/action，也可以提供其他参数）
          let stepNode: { modPath: string; pkgPath: string; name: string } | undefined;
          let relatedNodes: string[] | undefined;
          let additionalInfo: string | undefined;

          if (options.stepNode) {
            try {
              stepNode = JSON.parse(options.stepNode);
            } catch (error) {
              throw new Error('Invalid JSON format for --step-node');
            }
          }

          if (options.relatedNodes) {
            try {
              relatedNodes = JSON.parse(options.relatedNodes);
            } catch (error) {
              throw new Error('Invalid JSON format for --related-nodes');
            }
          }

          if (options.additionalInfo) {
            additionalInfo = options.additionalInfo;
          }

          // 执行部分更新
          await updateStep(taskData, numE2EIndex, numStepIndex, {
            ...(name && { name }),
            ...(filePath && { filePath }),
            ...(action && { action: action as 'create' | 'modify' | 'delete' }),
            ...(stepNode && { stepNode }),
            ...(relatedNodes && { relatedNodes }),
            ...(additionalInfo && { additionalInfo }),
          });
          await writeTaskFileAtomic(config.currentSpecPath, taskData);
          console.log(formatStepUpdateSuccess(numE2EIndex, numStepIndex, name || 'step updated'));
          return;
        }

        // 验证必需参数（用于插入模式）
        if (!name || !filePath || !action) {
          throw new Error(
            'Name, file_path, and action are required for insert mode'
          );
        }

        // 验证 action 值
        if (!['create', 'modify', 'delete'].includes(action)) {
          throw new Error('Action must be one of: create, modify, delete');
        }

        // 解析可选参数（用于插入模式）
        let relatedNodes: string[] = [];
        let stepNode: { modPath: string; pkgPath: string; name: string } | undefined;
        let additionalInfo: string | undefined;

        if (options.relatedNodes) {
          try {
            relatedNodes = JSON.parse(options.relatedNodes);
          } catch (error) {
            throw new Error('Invalid JSON format for --related-nodes');
          }
        }

        if (options.stepNode) {
          try {
            stepNode = JSON.parse(options.stepNode);
          } catch (error) {
            throw new Error('Invalid JSON format for --step-node');
          }
        }

        if (options.additionalInfo) {
          additionalInfo = options.additionalInfo;
        }

        // 智能选择 step index：空 steps 列表时自动为 0，否则递增
        let numStepIndexAdjusted: number;
        let useInsertMode = false;

        if (e2eTask.steps.length === 0) {
          // 空 steps 列表：使用 0 作为插入点（insertStep 会转换为 1）
          numStepIndexAdjusted = 0;
          useInsertMode = true;
        } else {
          // step 不存在：自动选择下一个连续位置
          const maxIndex = Math.max(
            ...e2eTask.steps
              .filter((s) => typeof s.index === 'number')
              .map((s) => s.index as number),
            0
          );

          // 智能插入：自动选择下一个位置
          numStepIndexAdjusted = maxIndex; // 在最后一个位置后插入
          useInsertMode = true;
        }

        // 根据智能选择的模式执行更新或插入
        if (useInsertMode || options.insert) {
          await insertStep(taskData, numE2EIndex, numStepIndexAdjusted, {
            name,
            filePath,
            relatedNodes,
            action: action as 'create' | 'modify' | 'delete',
            stepNode,
            additionalInfo,
          });
          await writeTaskFileAtomic(config.currentSpecPath, taskData);
          console.log(formatStepInsertSuccess(numE2EIndex, numStepIndex + 1, name));
        } else {
          await updateStep(taskData, numE2EIndex, numStepIndexAdjusted, {
            name,
            filePath,
            relatedNodes,
            action: action as 'create' | 'modify' | 'delete',
            stepNode,
            additionalInfo,
          });
          await writeTaskFileAtomic(config.currentSpecPath, taskData);
          console.log(formatStepUpdateSuccess(numE2EIndex, numStepIndex, name));
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red(`Error: ${error.message}`));
          process.exit(1);
        } else {
          console.error(chalk.red('Unknown error occurred'));
          process.exit(1);
        }
      }
    }
  );

/**
 * Step 命令（导出给 CLI 使用）
 */
export const stepCommand = new Command('step').description('Step 管理');
stepCommand.addCommand(stepUpdateAction);

