import {program} from 'commander';

import {register as registerMarks} from './workspaces/marks/src/index.js';
import {register as registerUpcomingTests} from './workspaces/upcoming-tests/src/index.js';

registerMarks(program);
registerUpcomingTests(program);

program.parse();
