"use strict";
const task_1 = require('./task');
function warp(fn) {
    return function () {
        let task = task_1.self();
        if (task) {
            Array.prototype.push.call(arguments, task.callback_success, task.callback_error);
            fn.apply(this, arguments);
            task.suspend();
        }
        else {
            task_1.throw_error(100);
        }
    };
}
exports.warp = warp;
function thunk(fn) {
    return function () {
        let task = task_1.self();
        if (task) {
            Array.prototype.push.call(arguments, task.callback_error);
            fn.apply(this, arguments);
            task.suspend();
        }
        else {
            task_1.throw_error(100);
        }
    };
}
exports.thunk = thunk;
function custom(fn, callback) {
    return function () {
        let task = task_1.self();
        if (task) {
            Array.prototype.push.call(arguments, callback.bind(this, task.callback_error, task.callback_success));
            fn.apply(this, arguments);
            task.suspend();
        }
        else {
            task_1.throw_error(100);
        }
    };
}
exports.custom = custom;

//# sourceMappingURL=../_maps/lib/util.js.map
