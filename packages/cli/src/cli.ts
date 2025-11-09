#!/usr/bin/env node
import { Command } from 'commander';
import { setupCommand } from './commands/setup.js';
import { startCommand } from './commands/start.js';
import { statusCommand } from './commands/status.js';
import { codeCommand } from './commands/code.js';
import { providersCommand } from './commands/providers.js';
import { modelsCommand } from './commands/models.js';
import { modelCommand } from './commands/model-selector.js';
import { authCommand } from './commands/auth.js';
import { configCommand } from './commands/config.js';
import { stopCommand } from './commands/stop.js';
import { tuiCommand } from './commands/tui.js';

const program = new Command();

program
  .name('ucr')
  .description('Universal Claude Router - Route Claude Code to any LLM provider')
  .version('0.1.0');

// Add commands
program.addCommand(setupCommand);
program.addCommand(startCommand);
program.addCommand(statusCommand);
program.addCommand(codeCommand);
program.addCommand(providersCommand);
program.addCommand(modelsCommand);
program.addCommand(modelCommand);
program.addCommand(authCommand);
program.addCommand(configCommand);
program.addCommand(stopCommand);
program.addCommand(tuiCommand);

program.parse();
