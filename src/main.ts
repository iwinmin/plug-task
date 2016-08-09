/**
 * plug-task library
 */
export { run, start, self, self_id, join, join_all, sleep, suspend, get_data, set_data } from "./lib/task";
export { warp, thunk, custom } from "./lib/util";
export { Queue } from "./lib/queue";
export const VERSION = '0.1.0';