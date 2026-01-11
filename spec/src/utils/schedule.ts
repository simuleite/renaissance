import { CodeTask, E2ETask, Step } from '../types';
import chalk from 'chalk';

/**
 * 查找同一 E2E 任务中的下一个未完成的 step
 * @param e2eTask - 当前 E2E 任务
 * @param currentStepIndex - 当前完成的 step 索引
 * @returns 下一个未完成的 step，如果没有则返回 null
 */
export function findNextIncompleteStep(
  e2eTask: E2ETask,
  currentStepIndex: number
): Step | null {
  // 过滤出未完成的步骤
  const incompleteSteps = e2eTask.steps.filter(
    (s) => !s.completed && s.index !== 'start' && s.index !== 'end'
  );

  if (incompleteSteps.length === 0) {
    return null;
  }

  // 返回第一个未完成的步骤
  return incompleteSteps[0];
}

/**
 * 查找下一个包含未完成步骤的 E2E 任务
 * @param task - 完整的 CodeTask
 * @param currentE2EIndex - 当前 E2E 任务索引
 * @returns 下一个包含未完成步骤的 E2E 任务，如果没有则返回 null
 */
export function findNextE2EWithIncompleteSteps(
  task: CodeTask,
  currentE2EIndex: number
): E2ETask | null {
  // 查找当前 E2E 之后的任务
  const currentE2EArrayIndex = task.e2eTasks.findIndex(
    (t) => t.index === currentE2EIndex
  );

  if (currentE2EArrayIndex === -1) {
    return null;
  }

  // 从当前 E2E 任务之后开始查找
  for (let i = currentE2EArrayIndex + 1; i < task.e2eTasks.length; i++) {
    const e2eTask = task.e2eTasks[i];

    // 跳过 start/end 节点
    if (e2eTask.index === 'start' || e2eTask.index === 'end') {
      continue;
    }

    // 检查是否有未完成的步骤
    const hasIncompleteSteps = e2eTask.steps.some(
      (s) => !s.completed && s.index !== 'start' && s.index !== 'end'
    );

    if (hasIncompleteSteps) {
      return e2eTask;
    }
  }

  return null;
}

/**
 * 检查 E2E 任务的所有步骤是否都已完成
 * @param e2eTask - E2E 任务
 * @returns 如果所有非 start/end 步骤都已完成，返回 true
 */
export function areAllStepsCompleted(e2eTask: E2ETask): boolean {
  const steps = e2eTask.steps.filter(
    (s) => s.index !== 'start' && s.index !== 'end'
  );

  if (steps.length === 0) {
    return false;
  }

  return steps.every((s) => s.completed);
}

/**
 * 检查 CODE_SPEC 是否完成
 * @param task - 完整的 CodeTask
 * @returns 如果所有 E2E 任务都已完成（且每个 E2E 都有 Step），返回 true
 */
export function isCodeSpecCompleted(task: CodeTask): boolean {
  const e2eTasks = task.e2eTasks.filter(
    (e) => e.index !== 'start' && e.index !== 'end'
  );

  // 没有 E2E = 未完成
  if (e2eTasks.length === 0) {
    return false;
  }

  // 所有 E2E 都必须完成（由 areAllStepsCompleted 决定）
  return e2eTasks.every((e2e) => areAllStepsCompleted(e2e));
}

/**
 * 检查并自动完成 E2E 任务
 * @param task - 完整的 CodeTask
 * @param e2eIndex - E2E 任务索引
 * @returns 如果 E2E 被自动完成，返回 true
 */
export function checkAndAutoCompleteE2E(
  task: CodeTask,
  e2eIndex: number
): boolean {
  const e2eTaskIndex = task.e2eTasks.findIndex((t) => t.index === e2eIndex);

  if (e2eTaskIndex === -1) {
    return false;
  }

  const e2eTask = task.e2eTasks[e2eTaskIndex];

  // 跳过 start/end 节点
  if (e2eTask.index === 'start' || e2eTask.index === 'end') {
    return false;
  }

  // 如果已经完成，不需要再次完成
  if (e2eTask.completed) {
    return false;
  }

  // 检查所有步骤是否完成
  if (areAllStepsCompleted(e2eTask)) {
    e2eTask.completed = true;
    return true;
  }

  return false;
}

/**
 * 格式化下一个 step 的输出
 * @param step - 下一个 step
 * @param e2eIndex - E2E 任务索引
 * @param stepIndex - step 索引
 * @returns 格式化后的字符串
 */
export function formatScheduleNextStep(
  step: Step,
  e2eIndex: number,
  stepIndex: number
): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.cyan('→ 下一步: ') + `[${e2eIndex}.${stepIndex}] ${step.name}`);
  lines.push(`   - file_path: ${step.filePath}`);
  lines.push(`   - action: ${step.action}`);

  if (step.additionalInfo) {
    lines.push(`   - additional_info: ${step.additionalInfo}`);
  }

  return lines.join('\n');
}

/**
 * 格式化下一个 E2E 任务的输出
 * @param e2eTask - 下一个 E2E 任务
 * @param e2eIndex - E2E 任务索引
 * @returns 格式化后的字符串
 */
export function formatScheduleNextE2E(e2eTask: E2ETask, e2eIndex: number): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.cyan('→ 下个E2E: ') + `[${e2eIndex}] ${e2eTask.name}`);

  // 列出所有未完成的步骤
  const incompleteSteps = e2eTask.steps.filter(
    (s) => !s.completed && s.index !== 'start' && s.index !== 'end'
  );

  if (incompleteSteps.length > 0) {
    incompleteSteps.forEach((step) => {
      const stepIndex = step.index as number;
      lines.push(`   - [${e2eIndex}.${stepIndex}] ${step.name}`);
    });
  }

  return lines.join('\n');
}

/**
 * 格式化 E2E 自动完成消息
 * @param e2eIndex - E2E 任务索引
 * @param e2eName - E2E 任务名称
 * @returns 格式化后的字符串
 */
export function formatE2EAutoCompleted(
  e2eIndex: number,
  e2eName: string
): string {
  return chalk.green('✓ 所有步骤已完成: ') + `E2E任务 [${e2eIndex}] ${e2eName}`;
}
