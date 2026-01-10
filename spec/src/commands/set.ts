import { Command } from 'commander';
import chalk from 'chalk';
import { detectProject } from '../utils/project-detector';
import { getTaskFilePath, readTaskFile } from '../utils/fs';
import { updateCurrentSpec } from '../utils/config';
import { formatSetSuccess } from '../utils/format';
import * as fs from 'fs-extra';

/**
 * spec set 命令实现
 */
export const setCommand = new Command('set')
  .argument('<date>', '任务日期 (yyyy-mm-dd)')
  .argument('<taskName>', '任务名称')
  .description('设置当前CODE_TASK')
  .action(async (date, taskName) => {
    let projectInfo: any;
    try {
      // 1. 验证日期格式
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new Error('Invalid date format');
      }

      // 验证日期有效性
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime()) || dateObj.toISOString().split('T')[0] !== date) {
        throw new Error('Invalid date format');
      }

      // 2. 验证任务名称
      if (!taskName || taskName.trim().length === 0) {
        throw new Error('Task name is required');
      }

      // 3. 检测项目类型和仓库信息
      projectInfo = await detectProject();

      // 4. 构建任务文件路径
      const taskFilePath = getTaskFilePath(
        projectInfo.repoName,
        date,
        taskName
      );

      // 5. 验证文件存在
      if (!await fs.pathExists(taskFilePath)) {
        throw new Error(`Task file not found: ${taskFilePath}`);
      }

      // 6. 读取任务文件(验证JSON格式)
      await readTaskFile(taskFilePath);

      // 7. 更新当前配置
      await updateCurrentSpec(taskFilePath);

      // 8. 输出成功信息
      const output = formatSetSuccess(taskName);
      console.log(output);

    } catch (error) {
      if (error instanceof Error) {
        handleSetError(error, projectInfo);
      } else {
        console.error(chalk.red('Unknown error occurred'));
        process.exit(1);
      }
    }
  });

/**
 * 错误处理函数
 */
function handleSetError(error: Error, projectInfo: any): void {
  if (error.message === 'Invalid date format') {
    console.error(chalk.red('Error: Invalid date format. Expected format: yyyy-mm-dd'));
    console.log(chalk.yellow('\n用法: spec set <yyyy-mm-dd> <taskName>'));
    console.log(chalk.yellow('示例: spec set 2025-01-09 my-task'));
  } else if (error.message === 'Task name is required') {
    console.error(chalk.red('Error: Task name is required'));
    console.log(chalk.yellow('\n用法: spec set <yyyy-mm-dd> <taskName>'));
  } else if (error.message.includes('Cannot identify project type')) {
    console.error(
      chalk.red('Error: Cannot identify project type (go.mod or package.json not found)')
    );
    console.log(chalk.yellow('\n提示: 请确保在Go或TypeScript项目目录中运行此命令'));
  } else if (error.message.includes('Task file not found')) {
    console.error(chalk.red(`Error: ${error.message}`));
    console.log(chalk.yellow('\n提示: 请使用 "spec list" 查看可用任务'));
    console.log(chalk.yellow('提示: 确认日期和任务名称正确'));
  } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
    console.error(
      chalk.red(`Error: Cannot update config file: Permission denied`)
    );
    console.log(chalk.yellow('\n提示: 请检查文件系统权限'));
  } else if (error.message.includes('JSON')) {
    console.error(chalk.red(`Error: Failed to parse task file: ${error.message}`));
    console.log(chalk.yellow('\n提示: 任务文件可能已损坏'));
  } else {
    console.error(chalk.red(`Error: ${error.message}`));
  }
  process.exit(1);
}
