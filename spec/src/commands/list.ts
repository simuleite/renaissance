import { Command } from 'commander';
import chalk from 'chalk';
import { readConfig } from '../utils/config';
import { readTaskFile } from '../utils/fs';
import { formatTaskList } from '../utils/format';

/**
 * spec list 命令实现
 */
export const listCommand = new Command('list')
  .description('列出当前CODE_TASK')
  .action(async () => {
    try {
      // 1. 读取配置
      const config = await readConfig();
      if (!config) {
        throw new Error('.spec/config.json not found');
      }

      // 2. 验证当前任务
      if (!config.currentSpecPath) {
        throw new Error('No current task is set');
      }

      // 3. 读取任务文件
      const task = await readTaskFile(config.currentSpecPath);

      // 4. 格式化输出
      const output = formatTaskList(task);
      console.log(output);

    } catch (error) {
      if (error instanceof Error) {
        handleListError(error);
      } else {
        console.error(chalk.red('Unknown error occurred'));
        process.exit(1);
      }
    }
  });

/**
 * 错误处理函数
 */
function handleListError(error: Error): void {
  if (error.message === '.spec/config.json not found') {
    console.error(
      chalk.red('Error: .spec/config.json not found')
    );
    console.log(chalk.yellow('\n提示: 请先使用 "spec create" 或 "spec set" 设置当前任务'));
  } else if (error.message === 'No current task is set') {
    console.error(chalk.red('Error: No current task is set'));
    console.log(chalk.yellow('\n提示: 请先使用 "spec create" 或 "spec set" 设置当前任务'));
  } else if (error.message.includes('Task file not found')) {
    console.error(chalk.red(`Error: ${error.message}`));
    console.log(chalk.yellow('\n提示: 请使用 "spec set" 重新设置任务路径'));
  } else if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
    console.error(chalk.red('Error: Task file not found'));
    console.log(chalk.yellow('\n提示: 请使用 "spec set" 重新设置任务路径'));
  } else if (error.message.includes('JSON') || error.message.includes('parse')) {
    console.error(chalk.red(`Error: Failed to parse task file: ${error.message}`));
    console.log(chalk.yellow('\n提示: 任务文件可能已损坏'));
  } else {
    console.error(chalk.red(`Error: ${error.message}`));
  }
  process.exit(1);
}
