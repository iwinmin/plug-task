"use strict";
var TASK_ID = 1;
var CURRENT_TASK_INDEX = -1;
var CURRENT_TASK = null;
var ALL_TASKS = new Map();
var RUNNING_TASKS = [];
var HR_TIME = ('object' == typeof process) && process.hrtime;
if (!HR_TIME) {
    HR_TIME = function (start) {
        let now = Date.now();
        if (start) {
            return [(now - start[0]) / 1000];
        }
        else {
            return [now];
        }
    };
}
function new_id() {
    while (ALL_TASKS.has(TASK_ID)) {
        TASK_ID = (TASK_ID & 0xfffffff) + 1;
    }
    return TASK_ID;
}
function remove_from_running(task) {
    let idx = RUNNING_TASKS.indexOf(task);
    if (idx > -1) {
        RUNNING_TASKS.splice(idx, 1);
        if (idx === CURRENT_TASK_INDEX) {
            idx--;
        }
    }
}
function resume_tasks(ids, is_error, result) {
    while (ids.length > 0) {
        let task = ALL_TASKS.get(ids.shift());
        if (task) {
            task.resume(is_error, result, false);
        }
    }
}
const TASK_STATUS = {
    RUNNING: 1,
    PENDING: 2,
    EXITED: 3,
    DONE: 4
};
class Task {
    constructor(generator, parent_tid, comment) {
        this.generator = generator;
        this.parent_tid = parent_tid;
        this.comment = comment;
        this.id = new_id();
        this.result = null;
        this.status = TASK_STATUS.RUNNING;
        this.detached = false;
        this.data = new Map();
        this.join_task_ids = [];
        ALL_TASKS.set(this.id, this);
        RUNNING_TASKS.push(this);
        if (!this.comment) {
            this.comment = `Task<#${this.id}>`;
        }
        this.callback_success = (data) => {
            this.resume(false, data, true);
        };
        this.callback_error = (error, data) => {
            if (error) {
                this.resume(true, error, true);
            }
            else {
                this.resume(false, data, true);
            }
        };
    }
    exit(result) {
        if (this.is_done()) {
            return false;
        }
        else {
            ALL_TASKS.delete(this.id);
            this.status = TASK_STATUS.EXITED;
            this.result = result;
            remove_from_running(this);
            resume_tasks(this.join_task_ids, true, result);
            run();
            return true;
        }
    }
    detach() {
        this.parent_tid = 0;
        this.detached = true;
    }
    is_done() {
        let s = this.status;
        return (s == TASK_STATUS.DONE || s == TASK_STATUS.EXITED);
    }
    is_detach() {
        return this.detached;
    }
    join(task_id) {
        if (this.join_task_ids.indexOf(task_id) == -1) {
            this.join_task_ids.push(task_id);
        }
    }
    suspend() {
        if (this.status == TASK_STATUS.RUNNING) {
            this.status = TASK_STATUS.PENDING;
            remove_from_running(this);
            return true;
        }
        return false;
    }
    resume(is_error, data, do_run) {
        if (this.status == TASK_STATUS.PENDING) {
            this.is_error = is_error;
            this.result = data;
            this.status = TASK_STATUS.RUNNING;
            RUNNING_TASKS.push(this);
            if (do_run) {
                run();
            }
        }
    }
    get_data(key, default_value) {
        let parent_task;
        if (this.data.has(key)) {
            return this.data.get(key);
        }
        else if (parent_task = ALL_TASKS.get(this.parent_tid)) {
            return parent_task.get_data(key, default_value);
        }
        else {
            return default_value;
        }
    }
    set_data(key, value) {
        this.data.set(key, value);
    }
    run() {
        let error = this.is_error;
        let result = this.result;
        let done = false;
        let gen = this.generator;
        let start_time = HR_TIME();
        do {
            try {
                result = error ? gen.throw(result) : gen.next(result);
                error = false;
                done = result.done;
                result = result.value;
                if (!done) {
                    if (result && result.then instanceof Function) {
                        this.suspend();
                        result.then(this.callback_success, this.callback_error);
                        break;
                    }
                    continue;
                }
            }
            catch (err) {
                error = true;
                result = err;
            }
            ALL_TASKS.delete(this.id);
            this.status = TASK_STATUS.DONE;
            remove_from_running(this);
            resume_tasks(this.join_task_ids, error, result);
            if (error) {
                console.log('%s uncaughtException:\n%s\n', this.comment, result.toString(), result);
            }
            break;
        } while (this.status === TASK_STATUS.RUNNING &&
            (RUNNING_TASKS.length === 1 ||
                HR_TIME(start_time)[0] < 1));
        this.is_error = error;
        this.result = result;
    }
}
function throw_error(code) {
    let message = [
        'Not in plug-task runtime context',
        'Task has detached'
    ][code % 10];
    return new Error(`E${code}: ${message}`);
}
exports.throw_error = throw_error;
function get(id) {
    return ALL_TASKS.get(id);
}
exports.get = get;
function run() {
    if (CURRENT_TASK_INDEX === -1) {
        while (RUNNING_TASKS.length > 0) {
            CURRENT_TASK_INDEX = (CURRENT_TASK_INDEX + 1) % RUNNING_TASKS.length;
            CURRENT_TASK = RUNNING_TASKS[CURRENT_TASK_INDEX];
            CURRENT_TASK.run();
        }
        CURRENT_TASK = null;
        CURRENT_TASK_INDEX = -1;
    }
}
exports.run = run;
function start(generator, comment) {
    let task = new Task(generator, CURRENT_TASK ? CURRENT_TASK.id : 0, comment);
    run();
    return task;
}
exports.start = start;
function self() {
    if (!CURRENT_TASK) {
        throw_error(100);
    }
    return CURRENT_TASK;
}
exports.self = self;
function self_id() {
    if (!CURRENT_TASK) {
        throw_error(100);
    }
    return CURRENT_TASK.id;
}
exports.self_id = self_id;
function join(task) {
    if (CURRENT_TASK_INDEX == -1) {
        throw_error(100);
    }
    else {
        if (task.is_done()) {
            return task.result;
        }
        else if (task.is_detach()) {
            throw_error(101);
        }
        else {
            task.join(CURRENT_TASK.id);
            CURRENT_TASK.suspend();
        }
    }
}
exports.join = join;
function* join_all(tasks) {
    for (let task of tasks) {
        yield join(task);
    }
}
exports.join_all = join_all;
function sleep(ms) {
    if (CURRENT_TASK) {
        setTimeout(CURRENT_TASK.callback_success, ms);
        CURRENT_TASK.suspend();
    }
    else {
        throw_error(100);
    }
}
exports.sleep = sleep;
function suspend() {
    if (CURRENT_TASK) {
        CURRENT_TASK.suspend();
    }
    else {
        throw_error(100);
    }
}
exports.suspend = suspend;
function get_data(key, default_value) {
    if (CURRENT_TASK) {
        return CURRENT_TASK.get_data(key, default_value);
    }
    else {
        throw_error(100);
    }
}
exports.get_data = get_data;
function set_data(key, value) {
    if (CURRENT_TASK) {
        return CURRENT_TASK.set_data(key, value);
    }
    else {
        throw_error(100);
    }
}
exports.set_data = set_data;

//# sourceMappingURL=../_maps/lib/task.js.map
