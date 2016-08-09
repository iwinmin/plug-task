export declare function warp(fn: Function): Function;
export declare function thunk(fn: Function): Function;
export declare type CustomCallback = (err_cb: Function, succ_cb: Function, ...fn_data: any[]) => void;
export declare function custom(fn: Function, callback: CustomCallback): Function;
