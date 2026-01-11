// CODE_TASK Specification 数据结构定义

/**
 * Step 状态枚举
 */
export enum StepStatus {
  PENDING = 'pending',              // 待办（默认）
  COMPLETED = 'completed',          // 已完成
  NEED_AST_NODE = 'need_ast_node'  // 待补 AST 节点
}

export interface CodeTask {
  metadata: {
    repoName: string;        // 仓库标识（go.mod module 或 package.json name）
    createdAt: string;       // yyyy-mm-dd
    taskName: string;        // 任务名称
    description: string;     // 任务描述
  };
  e2eTasks: E2ETask[];       // E2E任务链表
}

// E2E_TASK: 端到端验证任务
export interface E2ETask {
  index: number | 'start' | 'end';  // 在链表中的位置
  name: string;                     // E2E任务名称
  e2eInput: string;                 // 端到端输入命令
  e2eOutput: string;                // 预期的端到端输出
  completed: boolean;               // 完成状态
  steps: Step[];                    // 该E2E任务下的步骤链表
  nextE2EIndex?: number | 'end';    // 链表指针：下一个E2E任务
  prevE2EIndex?: number | 'start';  // 链表指针：上一个E2E任务
}

// Step: 单个原子步骤
export interface Step {
  e2eIndex: number;                 // 所属的E2E任务索引
  index: number | 'start' | 'end';   // 在E2E任务中的位置
  name: string;                     // 步骤名称
  filePath: string;                 // 目标文件路径
  relatedNodes: string[];           // 相关的node_ids数组
  action: 'modify' | 'create' | 'delete';  // 动作类型
  completed: boolean;               // 完成状态
  status?: StepStatus;              // Step 状态（默认 PENDING）

  // action=modify时必填，支持多个node
  stepNode?: {
    mod_path: string;    // 模块路径
    pkg_path: string;    // 包路径
    name: string;       // 节点名称
  }[];

  additionalInfo?: string;           // 附加信息
  nextStepIndex?: number | 'end';   // 链表指针：下一个步骤
  prevStepIndex?: number | 'start'; // 链表指针：上一个步骤
}

// CLI命令参数接口
export interface SpecCreateOptions {
  taskName: string;
  description?: string;
}

export interface SpecSetOptions {
  date: string;      // yyyy-mm-dd
  taskName: string;
}

export interface SpecE2EUpdateOptions {
  e2eTaskIndex: number;
  e2eTaskName: string;
  e2eValidationInput: string;
  e2eValidationOutput: string;
}

export interface SpecStepUpdateOptions {
  e2eTaskIndex: number;
  stepIndex: number;
  stepName: string;
  stepAdditionalInfo?: string;
  stepFilePath?: string;
  stepAction?: 'modify' | 'create' | 'delete';
  stepRelatedNodes?: string[];
  stepNode?: {
    mod_path: string;
    pkg_path: string;
    name: string;
  }[];
}

// 工作目录配置文件
export interface SpecConfig {
  currentSpecPath: string;  // 当前绑定的spec文件路径
  lastUpdated: string;      // 最后更新时间
}
