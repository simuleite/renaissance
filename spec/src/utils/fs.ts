import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { CodeTask } from '../types';

/**
 * 获取 .spec 目录的基础路径
 * @returns .spec 目录的基础路径（~/.spec）
 */
export function getSpecBasePath(): string {
  return path.join(os.homedir(), '.spec');
}

/**
 * 获取仓库目录路径
 * @param repoName 仓库名称（会被转换为安全路径名）
 * @returns 仓库目录路径
 */
export function getRepoPath(repoName: string): string {
  const { toSafePathName } = require('./path-converter');
  const safeName = toSafePathName(repoName);
  return path.join(getSpecBasePath(), safeName);
}

/**
 * 获取任务文件路径
 * @param repoName 仓库名称
 * @param date 日期字符串（yyyy-mm-dd）
 * @param taskName 任务名称
 * @returns 任务文件的完整路径
 */
export function getTaskFilePath(repoName: string, date: string, taskName: string): string {
  const repoPath = getRepoPath(repoName);
  return path.join(repoPath, date, `${taskName}.json`);
}

/**
 * 创建任务文件并初始化内容
 * @param repoName 仓库名称
 * @param taskName 任务名称
 * @param description 任务描述（可选）
 * @returns 创建的任务文件路径
 */
export async function createTaskFile(
  repoName: string,
  taskName: string,
  description: string = ''
): Promise<string> {
  const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
  const taskFilePath = getTaskFilePath(repoName, today, taskName);
  const taskDir = path.dirname(taskFilePath);

  // 创建目录（如果不存在）
  await fs.ensureDir(taskDir);

  // 初始化任务内容
  const taskData: CodeTask = {
    metadata: {
      repoName,
      createdAt: today,
      taskName,
      description
    },
    e2eTasks: []
  };

  // 写入JSON文件
  await fs.writeJSON(taskFilePath, taskData, { spaces: 2 });

  return taskFilePath;
}

/**
 * 读取任务文件
 * @param filePath 任务文件路径
 * @returns 任务数据
 */
export async function readTaskFile(filePath: string): Promise<CodeTask> {
  // 展开波浪号路径
  const expandedPath = filePath.replace('~', os.homedir());
  return await fs.readJSON(expandedPath);
}

/**
 * 写入任务文件
 * @param filePath 任务文件路径
 * @param taskData 任务数据
 */
export async function writeTaskFile(filePath: string, taskData: CodeTask): Promise<void> {
  const expandedPath = filePath.replace('~', os.homedir());
  await fs.writeJSON(expandedPath, taskData, { spaces: 2 });
}
