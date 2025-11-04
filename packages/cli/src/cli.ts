#!/usr/bin/env node

import { Command } from 'commander';
import { authCommand } from './commands/auth.js';
import { providersCommand } from './commands/providers.js';
import { modelsCommand } from './commands/models.js';
import { configCommand } from './commands/config.js';
import { setupCommand } from './commands/setup.js';
import { startCommand } from './commands/start.js';
import { statusCommand } from './commands/status.js';
import { modelSelectorCommand } from './commands/model-selector.js';
import { codeCommand } from './commands/code.js';

const program = new Command();

program.name('ucr').description('Universal Claude Router CLI').version('0.1.0');

// Add commands
program.addCommand(setupCommand);
program.addCommand(startCommand);
program.addCommand(authCommand);
program.addCommand(providersCommand);
program.addCommand(modelsCommand);
program.addCommand(configCommand);
program.addCommand(statusCommand);
program.addCommand(modelSelectorCommand);
program.addCommand(codeCommand);

program.parse();
