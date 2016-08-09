import { TaskInstance } from './task';
export declare class Queue<T> {
    private size;
    private queues;
    private current;
    private put_waits;
    private get_waits;
    constructor(size: number);
    constructor(size: number, values: T[]);
    constructor(size: number, init: number, value?: T);
    put(value: T): TaskInstance<number>;
    get(): TaskInstance<T>;
}
