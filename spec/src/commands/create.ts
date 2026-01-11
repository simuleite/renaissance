import { Command } from 'commander';
import chalk from 'chalk';
import { detectProject } from '../utils/project-detector';
import { createTaskFile, readTaskFile } from '../utils/fs';
import { updateCurrentSpec, readConfig } from '../utils/config';
import { formatCreateSuccess } from '../utils/format';
import { isCodeSpecCompleted } from '../utils/schedule';
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

      // 检查当前任务是否完成，决定是否自动切换
      let shouldAutoSwitch = true;
      const config = await readConfig();

      if (config?.currentSpecPath) {
        try {
          const currentTask = await readTaskFile(config.currentSpecPath);
          if (!isCodeSpecCompleted(currentTask)) {
            shouldAutoSwitch = false;
            console.log(chalk.green('✓ Created CODE_SPEC: ') + taskName);
            console.log(chalk.yellow(`\n⚠️  当前 CODE_SPEC "${currentTask.metadata.taskName}" 尚未完成`));
            console.log(chalk.yellow(`   新任务已创建，请检查后使用 'spec set' 手动切换`));
            return;
          }
        } catch {
          // 当前任务文件不存在或读取失败，允许切换
        }
      }

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