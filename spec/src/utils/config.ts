import * as fs from 'fs-extra';
import * as path from 'path';
import { SpecConfig } from '../types';

/**
 * 获取当前工作目录的配置文件路径
 * @returns 配置文件路径
 */
export function getConfigPath(cwd: string = process.cwd()): string {
  return path.join(cwd, '.spec', 'config.json');
}

/**
 * 读取配置文件
 * @param cwd 工作目录
 * @returns 配置数据
 */
export async function readConfig(cwd: string = process.cwd()): Promise<SpecConfig | null> {
  const configPath = getConfigPath(cwd);

  if (!await fs.pathExists(configPath)) {
    return null;
  }

  return await fs.readJSON(configPath);
}

/**
 * 写入配置文件
 * @param config 配置数据
 * @param cwd 工作目录
 */
export async function writeConfig(config: SpecConfig, cwd: string = process.cwd()): Promise<void> {
  const configPath = getConfigPath(cwd);
  const configDir = path.dirname(configPath);

  // 创建目录（如果不存在）
  await fs.ensureDir(configDir);

  // 写入配置文件
  await fs.writeJSON(configPath, config, { spaces: 2 });
}

/**
 * 更新当前任务绑定
 * @param specPath spec文件路径
 * @param cwd 工作目录
 */
export async function updateCurrentSpec(specPath: string, cwd: string = process.cwd()): Promise<void> {
  const config: SpecConfig = {
    currentSpecPath: specPath,
    lastUpdated: new Date().toISOString()
  };

  await writeConfig(config, cwd);
}
