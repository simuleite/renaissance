import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * 项目类型
 */
export enum ProjectType {
  GO = 'go',
  TYPESCRIPT = 'typescript',
  UNKNOWN = 'unknown'
}

/**
 * 项目信息
 */
export interface ProjectInfo {
  type: ProjectType;
  repoName: string;
}

/**
 * 检测当前目录的项目类型并获取repo名称
 * @param cwd 当前工作目录，默认为 process.cwd()
 * @returns 项目信息（对于不支持的语言，使用目录名称作为repo名称）
 */
export async function detectProject(cwd: string = process.cwd()): Promise<ProjectInfo> {
  const goModPath = path.join(cwd, 'go.mod');
  const packageJsonPath = path.join(cwd, 'package.json');

  // 检查 Go 项目
  if (await fs.pathExists(goModPath)) {
    const goModContent = await fs.readFile(goModPath, 'utf-8');
    const moduleMatch = goModContent.match(/^module\s+([^\s]+)/m);

    if (moduleMatch && moduleMatch[1]) {
      return {
        type: ProjectType.GO,
        repoName: moduleMatch[1]
      };
    }
  }

  // 检查 TypeScript/Node 项目
  if (await fs.pathExists(packageJsonPath)) {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (packageJson.name) {
      return {
        type: ProjectType.TYPESCRIPT,
        repoName: packageJson.name
      };
    }
  }

  // 无法识别项目类型时，使用目录名称作为 repo 名称
  const dirName = path.basename(cwd);
  return {
    type: ProjectType.UNKNOWN,
    repoName: dirName || 'unknown'
  };
}
