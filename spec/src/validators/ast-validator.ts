import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * AST Node 唯一标识符
 * 用于精确定位仓库中的某个 AST 节点
 */
export interface NodeID {
  mod_path: string;    // 模块路径
  pkg_path: string;    // 包路径
  name: string;        // 节点名称
}

/**
 * 单个 Node 验证结果
 */
export interface NodeValidationResult {
  valid: boolean;
  node?: NodeID;
  error?: string;
  hint?: string;
}

/**
 * AST Node 验证器
 * 用于验证 stepNode 和 relatedNodes 是否能被 ABCoder 成功调用
 */
export class AstValidator {
  constructor(private repoName: string) {}

  /**
   * 调用 reni cli get_ast_node 验证单个 Node
   * @private
   */
  private async callReniGetAstNode(node: NodeID): Promise<boolean> {
    try {
      // 转换 camelCase 到 snake_case（兼容旧格式）
      const normalizedNode = {
        mod_path: (node as any).mod_path || (node as any).modPath,
        pkg_path: (node as any).pkg_path || (node as any).pkgPath,
        name: node.name
      };
      const nodesParam = JSON.stringify([normalizedNode]);
      const cmd = `reni cli get_ast_node '${this.repoName}' '${nodesParam}'`;

      const { stdout } = await execAsync(cmd, {
        timeout: 10000 // 10秒超时
      });

      // 检查返回结果是否包含 "nodes"
      return stdout.includes('"nodes"');
    } catch (error: any) {
      return false;
    }
  }

  /**
   * 验证单个 AST Node
   */
  async validateNode(node: NodeID): Promise<NodeValidationResult> {
    // 转换 camelCase 到 snake_case（兼容旧格式）
    const normalizedNode = {
      mod_path: (node as any).mod_path || (node as any).modPath,
      pkg_path: (node as any).pkg_path || (node as any).pkgPath,
      name: node.name
    };
    const nodesParam = JSON.stringify([normalizedNode]);
    const cmd = `reni cli get_ast_node '${this.repoName}' '${nodesParam}'`;

    try {
      const valid = await this.callReniGetAstNode(node);

      if (valid) {
        return { valid: true, node };
      } else {
        return {
          valid: false,
          node,
          error: `Command failed: ${cmd}`,
          hint: `Use 'reni cli get_repo_structure ${this.repoName}' to list available nodes`
        };
      }
    } catch (error: any) {
      return {
        valid: false,
        node,
        error: `${error.message || 'Unknown error'}\n  Command: ${cmd}`,
        hint: 'Check if reni CLI is properly installed'
      };
    }
  }

  /**
   * 批量验证 Nodes
   */
  async validateNodes(nodes: NodeID[]): Promise<NodeValidationResult[]> {
    return Promise.all(nodes.map(node => this.validateNode(node)));
  }
}
