import * as path from 'path';
import * as os from 'os';
import {
  getSpecBasePath,
  getRepoPath,
  getTaskFilePath,
  createTaskFile
} from '../../src/utils/fs';
import * as fs from 'fs-extra';

jest.mock('fs-extra');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('fs utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 设置 mock 返回值类型
    (mockFs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (mockFs.writeJSON as jest.Mock).mockResolvedValue(undefined);
  });

  describe('getSpecBasePath', () => {
    it('应该返回 ~/.spec 路径', () => {
      const result = getSpecBasePath();
      expect(result).toBe(path.join(os.homedir(), '.spec'));
    });
  });

  describe('getRepoPath', () => {
    it('应该返回仓库路径', () => {
      const result = getRepoPath('github.com/user/myapp');
      expect(result).toBe(path.join(os.homedir(), '.spec', 'github.com_user_myapp'));
    });
  });

  describe('getTaskFilePath', () => {
    it('应该返回任务文件路径', () => {
      const result = getTaskFilePath('github.com/user/myapp', '2025-01-09', 'mytask');
      expect(result).toBe(
        path.join(os.homedir(), '.spec', 'github.com_user_myapp', '2025-01-09', 'mytask.json')
      );
    });
  });

  describe('createTaskFile', () => {
    it('应该创建任务文件和目录', async () => {
      const result = await createTaskFile('github.com/user/myapp', 'mytask', 'test description');

      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeJSON).toHaveBeenCalled();
      expect(result).toContain('github.com_user_myapp');
      expect(result).toContain('mytask.json');
    });

    it('应该创建空描述的任务文件', async () => {
      await createTaskFile('github.com/user/myapp', 'mytask');

      const writeCall = mockFs.writeJSON.mock.calls[0];
      expect(writeCall[2]).toEqual({ spaces: 2 });
    });
  });
});
