import { toSafePathName, fromSafePathName } from '../../src/utils/path-converter';

describe('path-converter', () => {
  describe('toSafePathName', () => {
    it('应该将路径分隔符替换为下划线', () => {
      expect(toSafePathName('github.com/user/myapp')).toBe('github.com_user_myapp');
    });

    it('应该处理单层路径', () => {
      expect(toSafePathName('myapp')).toBe('myapp');
    });

    it('应该处理多层路径', () => {
      expect(toSafePathName('a/b/c/d')).toBe('a_b_c_d');
    });

    it('应该保留其他字符', () => {
      expect(toSafePathName('my-app_v1.0')).toBe('my-app_v1.0');
    });
  });

  describe('fromSafePathName', () => {
    it('应该将下划线替换回路径分隔符', () => {
      expect(fromSafePathName('github.com_user_myapp')).toBe('github.com/user/myapp');
    });

    it('应该处理单层名称', () => {
      expect(fromSafePathName('myapp')).toBe('myapp');
    });

    it('应该处理多层名称', () => {
      expect(fromSafePathName('a_b_c_d')).toBe('a/b/c/d');
    });
  });
});
