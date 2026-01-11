import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import { readConfig } from '../utils/config';
import { readTaskFile } from '../utils/fs';
import { writeTaskFileAtomic } from '../utils/atomic-file';
import {
  formatUpdateSuccess,
  formatInsertSuccess,
  formatDeleteSuccess,
  formatCompletedSuccess,
  formatUncompletedSuccess,
  formatBatchCreateSuccess,
} from '../utils/format';
import { CodeTask, E2ETask } from '../types';

/**
 * 基础 E2E 任务更新逻辑
 */
async function updateE2ETask(
  taskData: CodeTask,
  index: number,
  updates: Partial<E2ETask>
): Promise<void> {
  const taskIndex = taskData.e2eTasks.findIndex(
    (t) => t.index === index
  );

  if (taskIndex === -1) {
    throw new Error(`E2E task with index ${index} not found`);
  }

  const task = taskData.e2eTasks[taskIndex];

  if (task.index === 'start' || task.index === 'end') {
    throw new Error('Cannot update start or end node');
  }

  // 更新字段
  if (updates.name !== undefined) task.name = updates.name;
  if (updates.e2eInput !== undefined) task.e2eInput = updates.e2eInput;
  if (updates.e2eOutput !== undefined) task.e2eOutput = updates.e2eOutput;

  taskData.e2eTasks[taskIndex] = task;
}

/**
 * 插入 E2E 任务
 */
async function insertE2ETask(
  taskData: CodeTask,
  afterIndex: number,
  newTask: Partial<E2ETask>
): Promise<void> {
  // 如果任务列表为空，直接创建第一个任务
  if (taskData.e2eTasks.length === 0) {
    const newNode: E2ETask = {
      index: 1,
      name: newTask.name!,
      e2eInput: newTask.e2eInput!,
      e2eOutput: newTask.e2eOutput!,
      completed: false,
      steps: [],
      prevE2EIndex: 'start',
      nextE2EIndex: 'end',
    };
    taskData.e2eTasks.push(newNode);
    return;
  }

  const afterTaskIndex = taskData.e2eTasks.findIndex(
    (t) => t.index === afterIndex
  );

  if (afterTaskIndex === -1) {
    throw new Error(`E2E task with index ${afterIndex} not found`);
  }

  const afterTask = taskData.e2eTasks[afterTaskIndex];

  if (afterTask.index === 'end') {
    throw new Error('Cannot insert after end node');
  }

  // 查找原 nextTask
  const nextIndex = afterTask.nextE2EIndex;
  const nextTaskIndex = taskData.e2eTasks.findIndex(
    (t) => t.index === nextIndex
  );

  // 创建新节点
  const newIndex = afterIndex + 1;
  const newNode: E2ETask = {
    index: newIndex,
    name: newTask.name!,
    e2eInput: newTask.e2eInput!,
    e2eOutput: newTask.e2eOutput!,
    completed: false,
    steps: [],
    prevE2EIndex: afterIndex,
    nextE2EIndex: nextIndex,
  };

  // 调整 afterTask 指针
  afterTask.nextE2EIndex = newIndex;

  // 调整 nextTask 指针
  if (nextTaskIndex !== -1) {
    const nextTask = taskData.e2eTasks[nextTaskIndex];
    nextTask.prevE2EIndex = newIndex;
  }

  // 后续节点 index +1
  taskData.e2eTasks
    .filter((t) => typeof t.index === 'number' && t.index > afterIndex)
    .forEach((t) => {
      t.index = (t.index as number) + 1;
      if (t.nextE2EIndex !== 'end' && typeof t.nextE2EIndex === 'number') {
        t.nextE2EIndex = t.nextE2EIndex + 1;
      }
      if (t.prevE2EIndex !== 'start' && typeof t.prevE2EIndex === 'number') {
        t.prevE2EIndex = t.prevE2EIndex + 1;
      }
    });

  // 插入新节点
  taskData.e2eTasks.push(newNode);
}

/**
 * 删除 E2E 任务
 */
async function deleteE2ETask(
  taskData: CodeTask,
  index: number
): Promise<{ name: string; newIndex: number }> {
  const taskIndex = taskData.e2eTasks.findIndex((t) => t.index === index);

  if (taskIndex === -1) {
    throw new Error(`E2E task with index ${index} not found`);
  }

  const task = taskData.e2eTasks[taskIndex];

  if (task.index === 'start' || task.index === 'end') {
    throw new Error('Cannot delete start or end node');
  }

  const name = task.name;
  const newIndex = task.index as number;

  // 调整 prevTask 指针
  if (task.prevE2EIndex !== undefined && task.prevE2EIndex !== 'start') {
    const prevTaskIndex = taskData.e2eTasks.findIndex(
      (t) => t.index === task.prevE2EIndex
    );
    if (prevTaskIndex !== -1) {
      taskData.e2eTasks[prevTaskIndex].nextE2EIndex = task.nextE2EIndex;
    }
  }

  // 调整 nextTask 指针
  if (task.nextE2EIndex !== undefined && task.nextE2EIndex !== 'end') {
    const nextTaskIndex = taskData.e2eTasks.findIndex(
      (t) => t.index === task.nextE2EIndex
    );
    if (nextTaskIndex !== -1) {
      taskData.e2eTasks[nextTaskIndex].prevE2EIndex = task.prevE2EIndex;
    }
  }

  // 删除节点
  taskData.e2eTasks.splice(taskIndex, 1);

  // 后续节点 index -1
  taskData.e2eTasks
    .filter((t) => typeof t.index === 'number' && t.index > index)
    .forEach((t) => {
      t.index = (t.index as number) - 1;
      if (t.nextE2EIndex !== 'end' && typeof t.nextE2EIndex === 'number') {
        t.nextE2EIndex = t.nextE2EIndex - 1;
      }
      if (t.prevE2EIndex !== 'start' && typeof t.prevE2EIndex === 'number') {
        t.prevE2EIndex = t.prevE2EIndex - 1;
      }
    });

  return { name, newIndex };
}

/**
 * 更新 E2E 任务完成状态
 */
async function updateE2EStatus(
  taskData: CodeTask,
  index: number,
  completed: boolean
): Promise<{ name: string }> {
  const taskIndex = taskData.e2eTasks.findIndex((t) => t.index === index);

  if (taskIndex === -1) {
    throw new Error(`E2E task with index ${index} not found`);
  }

  const task = taskData.e2eTasks[taskIndex];

  if (task.index === 'start' || task.index === 'end') {
    throw new Error('Cannot update start or end node');
  }

  task.completed = completed;

  return { name: task.name };
}

/**
 * 批量创建 E2E 任务
 */
interface BatchE2ETaskInput {
  name: string;
  e2eInput: string;
  e2eOutput: string;
}

interface BatchInput {
  e2eTasks: BatchE2ETaskInput[];
}

async function batchCreateE2ETasks(
  taskData: CodeTask,
  jsonFilePath: string
): Promise<{ count: number; names: string[] }> {
  // 读取 JSON 文件
  const expandedPath = jsonFilePath.replace('~', require('os').homedir());
  const batchData: BatchInput = await fs.readJSON(expandedPath);

  // 验证格式
  if (!batchData.e2eTasks || !Array.isArray(batchData.e2eTasks)) {
    throw new Error('Invalid batch file format: missing e2eTasks array');
  }

  // 获取当前最大 index
  const maxIndex = Math.max(
    ...taskData.e2eTasks
      .filter((t) => typeof t.index === 'number')
      .map((t) => t.index as number),
    0
  );

  const names: string[] = [];
  const tasksToCreate = batchData.e2eTasks;

  // 查找原最后一个节点
  const lastTaskIndex = taskData.e2eTasks.findIndex((t) => t.index === maxIndex);
  if (lastTaskIndex !== -1) {
    const lastTask = taskData.e2eTasks[lastTaskIndex];
    lastTask.nextE2EIndex = maxIndex + 1;
  }

  // 创建新节点
  tasksToCreate.forEach((taskInput, i) => {
    const newIndex = maxIndex + 1 + i;
    names.push(taskInput.name);

    const newNode: E2ETask = {
      index: newIndex,
      name: taskInput.name,
      e2eInput: taskInput.e2eInput,
      e2eOutput: taskInput.e2eOutput,
      completed: false,
      steps: [],
      prevE2EIndex: i === 0 ? maxIndex || 'start' : maxIndex + i,
      nextE2EIndex: i === tasksToCreate.length - 1 ? 'end' : maxIndex + 2 + i,
    };

    taskData.e2eTasks.push(newNode);
  });

  return { count: tasksToCreate.length, names };
}

/**
 * E2E Update 命令
 */
export const e2eUpdateCommand = new Command('update')
  .argument('[index]', 'E2E 任务索引或批量模式')
  .argument('[name]', 'E2E 任务名称')
  .argument('[input]', '端到端输入命令')
  .argument('[output]', '预期端到端输出')
  .option('-d, --delete', '删除指定 E2E 任务')
  .option('-i, --insert', '在指定位置后插入新任务')
  .option('-c, --complete', '标记为已完成')
  .option('-u, --uncomplete', '标记为未完成')
  .option('-b, --batch <jsonFile>', '批量创建模式，指定 JSON 文件路径')
  .description('更新 E2E 任务')
  .action(
    async (
      index: string,
      name: string,
      input: string,
      output: string,
      options
    ) => {
      try {
        const config = await readConfig();
        if (!config || !config.currentSpecPath) {
          throw new Error('No current CODE_TASK set. Use `spec set` first.');
        }

        const taskData = await readTaskFile(config.currentSpecPath);

        // 批量创建模式
        if (options.batch) {
          const result = await batchCreateE2ETasks(taskData, options.batch);
          await writeTaskFileAtomic(config.currentSpecPath, taskData);
          console.log(formatBatchCreateSuccess(result.count, result.names));
          return;
        }

        // 验证必需参数（对于update/insert模式）
        if (!name || !input || !output) {
          throw new Error(
            'Name, input, and output are required for update/insert'
          );
        }

        // 智能选择index：空任务列表时自动为1，否则递增
        let numIndex: number;
        let useInsertMode = false;

        if (taskData.e2eTasks.length === 0) {
          // 空任务列表：自动选择index 1
          numIndex = 0; // 使用0作为插入点，insertE2ETask会自动转换为1
          useInsertMode = true;
        } else if (!index) {
          // 未提供index：自动选择下一个可用index
          const maxIndex = Math.max(
            ...taskData.e2eTasks
              .filter((t) => typeof t.index === 'number')
              .map((t) => t.index as number),
            0
          );
          numIndex = maxIndex;
          useInsertMode = true;
        } else {
          const parsedIndex = parseInt(index, 10);
          if (isNaN(parsedIndex)) {
            throw new Error('Invalid index format');
          }

          // 检查index是否存在
          const taskExists = taskData.e2eTasks.some((t) => t.index === parsedIndex);
          if (!taskExists) {
            // index不存在：智能选择下一个位置
            const maxIndex = Math.max(
              ...taskData.e2eTasks
                .filter((t) => typeof t.index === 'number')
                .map((t) => t.index as number),
              0
            );

            // 智能插入：自动选择下一个位置
            numIndex = maxIndex; // 在最后一个位置后插入
            useInsertMode = true;
          } else {
            // index存在：使用update模式
            numIndex = parsedIndex;
            useInsertMode = false;
          }
        }

        // 删除模式
        if (options.delete) {
          const result = await deleteE2ETask(taskData, numIndex);
          await writeTaskFileAtomic(config.currentSpecPath, taskData);
          console.log(formatDeleteSuccess(result.newIndex, result.name));
          return;
        }

        // 完成状态切换
        if (options.complete || options.uncomplete) {
          if (options.complete) {
            // 禁用手动完成 E2E，引导用户使用 step complete
            console.error(chalk.red('Error: E2E tasks cannot be manually completed.'));
            console.log(chalk.yellow('\nHint: E2E tasks are automatically completed when all their steps are finished.'));
            console.log(chalk.yellow('Use: spec step update <e2e_index> <step_index> --complete'));
            process.exit(1);
          }

          // 允许取消完成
          const result = await updateE2EStatus(taskData, numIndex, false);
          await writeTaskFileAtomic(config.currentSpecPath, taskData);
          console.log(formatUncompletedSuccess(numIndex, result.name));
          return;
        }

        // 根据智能选择的模式执行更新或插入
        if (useInsertMode || options.insert) {
          await insertE2ETask(taskData, numIndex, {
            name,
            e2eInput: input,
            e2eOutput: output,
          });
          await writeTaskFileAtomic(config.currentSpecPath, taskData);
          console.log(formatInsertSuccess(numIndex + 1, name));
        } else {
          await updateE2ETask(taskData, numIndex, {
            name,
            e2eInput: input,
            e2eOutput: output,
          });
          await writeTaskFileAtomic(config.currentSpecPath, taskData);
          console.log(formatUpdateSuccess(numIndex, name));
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
