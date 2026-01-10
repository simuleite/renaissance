import chalk from 'chalk';
import { CodeTask, E2ETask, Step } from '../types';

/**
 * 格式化 spec create 成功输出
 */
export function formatCreateSuccess(
  taskName: string,
  repoName: string,
  // specPath: string
): string {
  return [
    chalk.green('✓ Created CODE TASK: ') + taskName,
    'Current CODE TASK: ' + taskName,
    'Repository: ' + repoName,
    // 'Spec file: ' + specPath
  ].join('\n');
}

/**
 * 格式化 spec set 成功输出
 */
export function formatSetSuccess(taskName: string): string {
  return [
    chalk.green('✓ Loaded CODE TASK: ') + taskName,
    'Current CODE TASK: ' + taskName
  ].join('\n');
}

/**
 * 格式化更新成功输出
 */
export function formatUpdateSuccess(index: number, name: string): string {
  return chalk.green('✓ Updated: ') + `[${index}] ${name}`;
}

/**
 * 格式化删除成功输出
 */
export function formatDeleteSuccess(index: number, name: string): string {
  return chalk.green('✓ Deleted: ') + `[${index}] ${name}`;
}

/**
 * 格式化插入成功输出
 */
export function formatInsertSuccess(index: number, name: string): string {
  return chalk.green('✓ Inserted: ') + `[${index}] ${name}`;
}

/**
 * 格式化完成状态更新输出
 */
export function formatCompletedSuccess(index: number, name: string): string {
  return chalk.green('✓ Completed: ') + `[${index}] ${name}`;
}

/**
 * 格式化取消完成状态输出
 */
export function formatUncompletedSuccess(index: number, name: string): string {
  return chalk.green('✓ Uncompleted: ') + `[${index}] ${name}`;
}

/**
 * 格式化任务列表输出
 */
export function formatTaskList(task: CodeTask): string {
  const lines: string[] = [];

  task.e2eTasks.forEach((e2eTask, e2eIndex) => {
    if (e2eTask.index === 'start' || e2eTask.index === 'end') return;

    const e2eStatus = e2eTask.completed ? chalk.green('✓') : '[ ]';
    lines.push(`${e2eIndex + 1}. ${e2eStatus} ${e2eTask.name}${e2eTask.completed ? '（已完成）' : ''}`);

    e2eTask.steps.forEach((step, stepIndex) => {
      if (step.index === 'start' || step.index === 'end') return;

      const stepStatus = step.completed ? chalk.green('✓') : '[ ]';
      lines.push(`    ${e2eIndex + 1}.${stepIndex + 1} ${stepStatus} ${step.name}`);
      lines.push(`        - file_path: ${step.filePath}`);
      lines.push(`        - action: ${step.action}`);
      if (step.additionalInfo) {
        lines.push(`        - additional_info: ${step.additionalInfo}`);
      }
    });
  });

  return lines.join('\n');
}
