import adhkar from './adhkar';
import app from './app';
import common from './common';
import credits from './credits';
import goals from './goals';
import home from './home';
import khatma from './khatma';
import library from './library';
import listening from './listening';
import memorization from './memorization';
import plans from './plans';
import practice from './practice';
import prayers from './prayers';
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
const messages = { adhkar, app, common, credits, goals, home, khatma, library, listening, memorization, plans, practice, prayers, reader, recitation, recurring, revision, session, settings, share, themes } as const;
export default messages;
