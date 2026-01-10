#!/usr/bin/env node

import { Command } from 'commander';
import { createCommand } from '../commands/create';

const program = new Command();

program
  .name('spec')
  .description('CODE_TASK 管理工具')
  .version('0.1.0');

// 注册 create 命令
program.addCommand(createCommand);

// 解析命令行参数
program.parse(process.argv);
