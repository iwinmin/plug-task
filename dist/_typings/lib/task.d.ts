export interface TaskInstance<T> extends IterableIterator<T> {
    is_async_iterator?: void;
    next(value: any): IteratorResult<any>;
    throw?(e: any): IteratorResult<any>;
    [Symbol.iterator](): TaskInstance<T>;
}
export interface TaskBase {
    id: number;
    result: any;
    callback_error: Function;
    callback_success: Function;
    exit(result?: any): boolean;
    detach(): void;
    is_done(): boolean;
    is_detach(): boolean;
    join(task_id: number): void;
    suspend(): boolean;
    get_data(key: string, default_value?: any): any;
    set_data(key: string, value: any): void;
    resume(is_error: boolean, data: any, do_run: boolean): void;
    run(): void;
}
export declare function throw_error(code: number): Error;
export declare function get(id: number): TaskBase;
export declare function run(): void;
export declare function start(generator: TaskInstance<any>, comment?: string): TaskBase;
export declare function self(): TaskBase;
export declare function self_id(): number;
export declare function join(task: TaskBase): any;
export declare function join_all(tasks: TaskBase[]): TaskInstance<void>;
export declare function sleep(ms: number): void;
export declare function suspend(): any;
export declare function get_data(key: string, default_value?: any): any;
export declare function set_data(key: string, value: any): void;
