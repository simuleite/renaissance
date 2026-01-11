import fs from 'fs-extra';
import os from 'os';
import { CodeTask } from '../types';

/**
 * 原子性写入任务文件
 * 1. 写入临时文件
 * 2. 原子性重命名
 * @param filePath 任务文件路径
 * @param taskData 任务数据
 */
export async function writeTaskFileAtomic(
  filePath: string,
  taskData: CodeTask
): Promise<void> {
  const expandedPath = filePath.replace('~', os.homedir());
  const tmpPath = `${expandedPath}.tmp`;

  try {
    // 写入临时文件
    await fs.writeJSON(tmpPath, taskData, { spaces: 2 });
    // 原子性重命名
    await fs.rename(tmpPath, expandedPath);
  } catch (error) {
    // 清理临时文件
    try {
      await fs.remove(tmpPath);
    } catch {
      // 忽略清理错误
    }
    throw error;
  }
}
