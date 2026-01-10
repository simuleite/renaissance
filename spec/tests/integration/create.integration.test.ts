import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as tmp from 'tmp';
import { globSync } from 'glob';

describe('create command integration tests', () => {
  let testDir: string;
  let specDir: string;

  beforeEach(() => {
    // 创建临时测试目录
    testDir = tmp.dirSync({ unsafeCleanup: true }).name;
    specDir = path.join(os.homedir(), '.spec');
  });

  afterEach(() => {
    // 清理
    fs.removeSync(specDir);
  });

  describe('Go项目', () => {
    it('应该成功创建CODE_TASK', () => {
      // 创建Go项目
      fs.writeFileSync(path.join(testDir, 'go.mod'), 'module github.com/user/test_project\n\ngo 1.21');

      // 执行 spec create 命令
      const output = execSync(`${path.join(__dirname, '../../dist/cli/index.js')} create test_task`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      // 验证输出
      expect(output).toContain('✓ Created CODE TASK: test_task');
      expect(output).toContain('Current CODE TASK: test_task');
      expect(output).toContain('Repository: github.com/user/test_project');

      // 验证文件创建
      const taskFile = path.join(specDir, 'github.com_user_test_project', '*', 'test_task.json');
      const files = globSync(taskFile);
      expect(files.length).toBe(1);

      // 验证JSON内容
      const taskData = fs.readJSONSync(files[0]);
      expect(taskData.metadata.repoName).toBe('github.com/user/test_project');
      expect(taskData.metadata.taskName).toBe('test_task');
      expect(taskData.metadata.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(taskData.e2eTasks).toEqual([]);

      // 验证配置文件
      const configFile = path.join(testDir, '.spec', 'config.json');
      expect(fs.existsSync(configFile)).toBe(true);
      const config = fs.readJSONSync(configFile);
      expect(config.currentSpecPath).toContain('test_task.json');
      expect(config.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('应该支持description选项', () => {
      // 创建Go项目
      fs.writeFileSync(path.join(testDir, 'go.mod'), 'module github.com/user/test_project\n\ngo 1.21');

      // 执行命令
      const output = execSync(`${path.join(__dirname, '../../dist/cli/index.js')} create test_task -d "test description"`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      expect(output).toContain('✓ Created CODE TASK: test_task');

      // 验证JSON内容
      const taskFile = globSync(path.join(specDir, 'github.com_user_test_project', '*', 'test_task.json'))[0];
      const taskData = fs.readJSONSync(taskFile);
      expect(taskData.metadata.description).toBe('test description');
    });
  });

  describe('TypeScript项目', () => {
    it('应该成功创建CODE_TASK', () => {
      // 创建TypeScript项目
      const packageJson = {
        name: 'my-test-app',
        version: '1.0.0'
      };
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // 执行 spec create 命令
      const output = execSync(`${path.join(__dirname, '../../dist/cli/index.js')} create test_task`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      // 验证输出
      expect(output).toContain('✓ Created CODE TASK: test_task');
      expect(output).toContain('Repository: my-test-app');

      // 验证文件创建
      const taskFile = path.join(specDir, 'my-test-app', '*', 'test_task.json');
      const files = globSync(taskFile);
      expect(files.length).toBe(1);

      // 验证JSON内容
      const taskData = fs.readJSONSync(files[0]);
      expect(taskData.metadata.repoName).toBe('my-test-app');
      expect(taskData.metadata.taskName).toBe('test_task');
    });
  });

  describe('错误处理', () => {
    it('应该在无法识别项目类型时报错', () => {
      // 不创建任何项目文件

      try {
        execSync(`${path.join(__dirname, '../../dist/cli/index.js')} create test_task`, {
          cwd: testDir,
          encoding: 'utf-8'
        });
        fail('应该抛出错误');
      } catch (error) {
        const err = error as any;
        expect(err.stderr).toContain('Cannot identify project type');
        expect(err.stderr).toContain('go.mod or package.json not found');
      }
    });

    it('应该在任务名称为空时报错', () => {
      // 创建Go项目
      fs.writeFileSync(path.join(testDir, 'go.mod'), 'module github.com/user/test_project\n\ngo 1.21');

      try {
        execSync(`${path.join(__dirname, '../../dist/cli/index.js')} create`, {
          cwd: testDir,
          encoding: 'utf-8'
        });
        fail('应该抛出错误');
      } catch (error) {
        const err = error as any;
        expect(err.stderr || err.stdout).toContain('missing required argument');
      }
    });
  });

  describe('重复创建', () => {
    it('应该允许重复创建同名任务（覆盖）', () => {
      // 创建Go项目
      fs.writeFileSync(path.join(testDir, 'go.mod'), 'module github.com/user/test_project\n\ngo 1.21');

      // 第一次创建
      execSync(`${path.join(__dirname, '../../dist/cli/index.js')} create test_task`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      // 第二次创建（同一天）
      const output = execSync(`${path.join(__dirname, '../../dist/cli/index.js')} create test_task`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      expect(output).toContain('✓ Created CODE TASK: test_task');
    });
  });
});