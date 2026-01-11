#!/usr/bin/env node

import { Command } from 'commander';
import { createCommand } from '../commands/create';
import { setCommand } from '../commands/set';
import { listCommand } from '../commands/list';
import { validateCommand } from '../commands/validate';
import { e2eUpdateCommand } from '../commands/e2e-update';
import { stepCommand } from '../commands/step-update';

const program = new Command();

program
  .name('spec')
  .description('CODE_TASK 管理工具')
  .version('0.1.0');

// 注册 create 命令
program.addCommand(createCommand);

// 注册 set 命令
program.addCommand(setCommand);

// 注册 list 命令
program.addCommand(listCommand);

// 注册 validate 命令
program.addCommand(validateCommand);

// 创建 e2e 子命令组
const e2eCommand = new Command('e2e').description('E2E 任务管理');
e2eCommand.addCommand(e2eUpdateCommand);
program.addCommand(e2eCommand);

// 注册 step 命令（与 e2e 平级）
program.addCommand(stepCommand);

// 解析命令行参数
program.parse(process.argv);
