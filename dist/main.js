"use strict";
var task_1 = require("./lib/task");
exports.run = task_1.run;
exports.start = task_1.start;
exports.self = task_1.self;
exports.self_id = task_1.self_id;
exports.join = task_1.join;
exports.join_all = task_1.join_all;
exports.sleep = task_1.sleep;
exports.suspend = task_1.suspend;
exports.get_data = task_1.get_data;
exports.set_data = task_1.set_data;
var util_1 = require("./lib/util");
exports.warp = util_1.warp;
exports.thunk = util_1.thunk;
exports.custom = util_1.custom;
var queue_1 = require("./lib/queue");
exports.Queue = queue_1.Queue;
exports.VERSION = '0.1.0';

//# sourceMappingURL=_maps/main.js.map
