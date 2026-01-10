import { detectProject, ProjectType } from '../../src/utils/project-detector';
import * as fs from 'fs-extra';
import * as path from 'path';

jest.mock('fs-extra');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('project-detector', () => {
  const testDir = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    // 设置 mock 返回值类型
    (mockFs.pathExists as jest.Mock).mockResolvedValue(true);
    (mockFs.readFile as unknown as jest.Mock).mockResolvedValue('module github.com/user/myapp\n\ngo 1.21');
  });

  describe('Go项目检测', () => {
    it('应该正确检测Go项目', async () => {
      const result = await detectProject(testDir);

      expect(result.type).toBe(ProjectType.GO);
      expect(result.repoName).toBe('github.com/user/myapp');
      expect(mockFs.pathExists).toHaveBeenCalledWith(path.join(testDir, 'go.mod'));
      expect(mockFs.readFile).toHaveBeenCalledWith(path.join(testDir, 'go.mod'), 'utf-8');
    });

    it('应该处理没有module的go.mod', async () => {
      // 模拟 go.mod 存在但没有 module 行，package.json 也不存在
      (mockFs.pathExists as jest.Mock)
        .mockResolvedValueOnce(true)   // go.mod 存在
        .mockResolvedValueOnce(false);  // package.json 不存在
      (mockFs.readFile as unknown as jest.Mock).mockResolvedValueOnce('go 1.21');

      await expect(detectProject(testDir)).rejects.toThrow(
        'Cannot identify project type (go.mod or package.json not found)'
      );
    });
  });

  describe('TypeScript项目检测', () => {
    it('应该正确检测TypeScript项目', async () => {
      // 模拟 go.mod 不存在，package.json 存在
      (mockFs.pathExists as jest.Mock)
        .mockResolvedValueOnce(false)  // go.mod
        .mockResolvedValueOnce(true);  // package.json

      (mockFs.readFile as unknown as jest.Mock).mockResolvedValue(JSON.stringify({
        name: 'my-app',
        version: '1.0.0'
      }));

      const result = await detectProject(testDir);

      expect(result.type).toBe(ProjectType.TYPESCRIPT);
      expect(result.repoName).toBe('my-app');
      expect(mockFs.pathExists).toHaveBeenCalledWith(path.join(testDir, 'package.json'));
    });

    it('应该处理没有name的package.json', async () => {
      // 模拟 go.mod 不存在，package.json 存在
      (mockFs.pathExists as jest.Mock)
        .mockResolvedValueOnce(false)  // go.mod
        .mockResolvedValueOnce(true);  // package.json

      (mockFs.readFile as unknown as jest.Mock).mockResolvedValue(JSON.stringify({
        version: '1.0.0'
      }));

      await expect(detectProject(testDir)).rejects.toThrow();
    });
  });

  describe('未知项目类型', () => {
    it('应该在无法识别项目类型时抛出错误', async () => {
      // 模拟两个文件都不存在
      (mockFs.pathExists as jest.Mock).mockResolvedValue(false);

      await expect(detectProject(testDir)).rejects.toThrow(
        'Cannot identify project type (go.mod or package.json not found)'
      );
    });
  });
});