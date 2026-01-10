/**
 * 转换 repo_name 为安全的路径名
 * @param repoName 原始仓库名称
 * @returns 安全的路径名
 */
export function toSafePathName(repoName: string): string {
  // 将路径分隔符替换为下划线
  return repoName.replace(/\//g, '_');
}

/**
 * 转换安全的路径名回原始 repo_name
 * @param safePathName 安全的路径名
 * @returns 原始仓库名称
 */
export function fromSafePathName(safePathName: string): string {
  // 将下划线替换回路径分隔符
  return safePathName.replace(/_/g, '/');
}