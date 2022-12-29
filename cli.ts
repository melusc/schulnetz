import {program} from 'commander';

import {register as registerMarks} from './workspaces/marks/src/index.js';

registerMarks(program);

program.parse();
