import adhkar from './adhkar';
import app from './app';
import common from './common';
import goals from './goals';
import home from './home';
import khatma from './khatma';
import library from './library';
import memorization from './memorization';
import plans from './plans';
import reader from './reader';
import recitation from './recitation';
import recurring from './recurring';
import revision from './revision';
import session from './session';
import settings from './settings';
import share from './share';
import themes from './themes';

/**
 * The Arabic catalog is the source of truth: keys, placeholders and plural forms start here.
 * One namespace per area of the app; `common` and `goals` hold text shared across areas.
 */
const messages = { adhkar, app, common, goals, home, khatma, library, memorization, plans, reader, recitation, recurring, revision, session, settings, share, themes } as const;
export default messages;
