import { Command } from 'commander';
import chalk from 'chalk';
import { detectProject } from '../utils/project-detector';
import { createTaskFile } from '../utils/fs';
import { updateCurrentSpec } from '../utils/config';
import { formatCreateSuccess } from '../utils/format';
import * as path from 'path';
import * as os from 'os';

/**
 * spec create 命令实现
 */
export const createCommand = new Command('create')
  .argument('<taskName>', '任务名称')
  .option('-d, --description <description>', '任务描述')
  .description('创建新的CODE_TASK')
  .action(async (taskName, options) => {
    let projectInfo: any;
    try {
      // 验证任务名称
      if (!taskName || taskName.trim().length === 0) {
        throw new Error('Task name is required');
      }

      // 检测项目类型和仓库信息
      projectInfo = await detectProject();

      // 创建任务文件
      const taskFilePath = await createTaskFile(
        projectInfo.repoName,
        taskName,
        options.description || ''
      );

      // 更新工作目录配置
      await updateCurrentSpec(taskFilePath);

      // 输出成功信息
      const output = formatCreateSuccess(
        taskName,
        projectInfo.repoName
      );
      console.log(output);

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Cannot identify project type')) {
          console.error(
            chalk.red('Error: Cannot identify project type (go.mod or package.json not found)')
          );
          console.log(chalk.yellow('\n提示: 请确保在Go或TypeScript项目目录中运行此命令'));
        } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
          console.error(
            chalk.red(`Error: Cannot create directory ~/.spec/${projectInfo.repoName}: Permission denied`)
          );
          console.log(chalk.yellow('\n提示: 请检查文件系统权限'));
        } else if (error.message.includes('Task name is required')) {
          console.error(chalk.red('Error: Task name is required'));
          console.log(chalk.yellow('\n用法: spec create <taskName>'));
        } else {
          console.error(chalk.red(`Error: ${error.message}`));
        }
        process.exit(1);
      } else {
        console.error(chalk.red('Unknown error occurred'));
        process.exit(1);
      }
    }
  });