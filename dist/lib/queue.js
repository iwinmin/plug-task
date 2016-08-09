"use strict";
const task_1 = require('./task');
class Queue {
    constructor(size, init, value) {
        this.size = size;
        this.queues = [];
        this.current = 0;
        this.put_waits = [];
        this.get_waits = [];
        if (init) {
            if (typeof init == 'number') {
                while (init-- > 0) {
                    this.queues.push(value);
                }
            }
            else {
                this.queues = init.slice(0);
            }
        }
        this.current = this.queues.length;
    }
    *put(value) {
        if (this.size > 0 && this.current >= this.size) {
            this.put_waits.push(task_1.self_id());
            yield task_1.suspend();
            this.queues.push(value);
            return this.current;
        }
        while (this.get_waits.length > 0) {
            let tid = this.get_waits.shift();
            let cur = task_1.get(tid);
            if (cur) {
                cur.resume(false, value, true);
                return 0;
            }
        }
        this.queues.push(value);
        return ++this.current;
    }
    *get() {
        if (this.current <= 0) {
            this.get_waits.push(task_1.self_id());
            return yield task_1.suspend();
        }
        while (this.put_waits.length > 0) {
            let tid = this.put_waits.shift();
            let cur = task_1.get(tid);
            if (cur) {
                let value = this.queues.shift();
                cur.resume(false, null, true);
                return value;
            }
        }
        this.current--;
        return this.queues.shift();
    }
}
exports.Queue = Queue;

//# sourceMappingURL=../_maps/lib/queue.js.map
