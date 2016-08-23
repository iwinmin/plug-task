import { TaskInstance } from './util';
import { Task, self, get, id } from './task';
export { Task, TaskInstance, self, get };

// start a nwe task
export function start<T>(generator:TaskInstance<T>, comment?:string)
{
	return new Task<T>(generator, id(), comment);
}

// get current task id
export function self_id():number
{
	return self().id;
}

// exit current task
export function* exit(code?:number, error?:any):TaskInstance<void>
{
	let CURRENT_TASK = self();
	yield Task.exit(CURRENT_TASK, code, error);
}

// wait a sub task end
export function* join(task:Task<any>):TaskInstance<number>
{
	let CURRENT_TASK = self();
	if (!task.is_done())
	{
		// suspend current task
		Task.add_join_id(task, CURRENT_TASK.id);
		yield Task.suspend(CURRENT_TASK);
	}
	return task.code;
}

// wait all sub task end
export function* join_all(tasks:Task<any>[]):TaskInstance<number[]>
{
	let codes:number[] = [];
	for (let task of tasks)
	{
		let code = yield* join(task)
		codes.push(code);
	}
	return codes;
}

// suspend task for certain time
export function* sleep(ms:number):TaskInstance<void>
{
	let CURRENT_TASK = self();
	setTimeout(CURRENT_TASK.resume_success, ms);
	yield Task.suspend(CURRENT_TASK);
}

// suspend current task
export function* suspend():TaskInstance<void>
{
	let CURRENT_TASK = self();
	yield Task.suspend(CURRENT_TASK);
}

// suspend current task and return the wake callback value
export function wait<T>():TaskInstance<T>;
export function wait<T>(type:T):TaskInstance<T>;
export function* wait<T>():TaskInstance<T>
{
	let CURRENT_TASK = self();
	return <T>(yield Task.suspend(CURRENT_TASK));
}

// get task private data
export function get_data(key:string, default_value?:any)
{
	let CURRENT_TASK = self();
	return CURRENT_TASK.get_data(key, default_value);
}

// set task private data
export function set_data(key:string, value:any)
{
	let CURRENT_TASK = self();
	return CURRENT_TASK.set_data(key, value);
}


export interface SUCCESS<T> {
	(data:T): any
}
export interface THUNKCB<T> {
	(err:any, data?:T): any
}
export interface CustomCallback<T> {
	(callback:(err:any, data?:T)=>void, ...argv:any[]): any;
}
// callback function wrap helper
// add two callback function after arguments
// arguments...<success_callback>, <error_callback>
export function wrap<T>(fn:(cb:SUCCESS<T>,err:THUNKCB<T>)=>any):()=>TaskInstance<T>;
export function wrap<T,T0>(fn:(v0:T0,cb:SUCCESS<T>,err:THUNKCB<T>)=>any):(v0:T0)=>TaskInstance<T>;
export function wrap<T,T0,T1>(fn:(v0:T0,v1:T1,cb:SUCCESS<T>,err:THUNKCB<T>)=>any):(v0:T0,v1:T1)=>TaskInstance<T>;
export function wrap<T,T0,T1,T2>(fn:(v0:T0,v1:T1,v2:T2,cb:SUCCESS<T>,err:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2)=>TaskInstance<T>;
export function wrap<T,T0,T1,T2,T3>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,cb:SUCCESS<T>,err:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3)=>TaskInstance<T>;
export function wrap<T,T0,T1,T2,T3,T4>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,cb:SUCCESS<T>,err:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4)=>TaskInstance<T>;
export function wrap<T,T0,T1,T2,T3,T4,T5>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,cb:SUCCESS<T>,err:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5)=>TaskInstance<T>;
export function wrap<T,T0,T1,T2,T3,T4,T5,T6>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,cb:SUCCESS<T>,err:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6)=>TaskInstance<T>;
export function wrap<T,T0,T1,T2,T3,T4,T5,T6,T7>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,cb:SUCCESS<T>,err:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7)=>TaskInstance<T>;
export function wrap<T,T0,T1,T2,T3,T4,T5,T6,T7,T8>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,cb:SUCCESS<T>,err:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8)=>TaskInstance<T>;
export function wrap<T,T0,T1,T2,T3,T4,T5,T6,T7,T8,T9>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,v9:T9,cb:SUCCESS<T>,err:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,v9:T9)=>TaskInstance<T>;
export function wrap<T,T0,T1,T2,T3,T4,T5,T6,T7,T8,T9,T10>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,v9:T9,v10:T10,cb:SUCCESS<T>,err:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,v9:T9,v10:T10)=>TaskInstance<T>;
export function wrap<T>(fn:(...argv:any[])=>any):(...argv:any[])=>TaskInstance<T>;
export function wrap<T>(fn:(...argv:any[])=>any):(...argv:any[])=>TaskInstance<T>
{
	return function*():TaskInstance<T>
	{
		let task = self();
		Array.prototype.push.call(arguments, task.resume_success, task.resume_thunk);
		fn.apply(this, arguments);
		return yield Task.suspend(task);
	}
}

// thunk like function callback wrap helper
// add one callback function after arguments
// arguments...<callback(error, data)>
export function thunk<T>(fn:(cb:THUNKCB<T>)=>any):()=>TaskInstance<T>;
export function thunk<T,T0>(fn:(v0:T0,cb:THUNKCB<T>)=>any):(v0:T0)=>TaskInstance<T>;
export function thunk<T,T0,T1>(fn:(v0:T0,v1:T1,cb:THUNKCB<T>)=>any):(v0:T0,v1:T1)=>TaskInstance<T>;
export function thunk<T,T0,T1,T2>(fn:(v0:T0,v1:T1,v2:T2,cb:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2)=>TaskInstance<T>;
export function thunk<T,T0,T1,T2,T3>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,cb:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3)=>TaskInstance<T>;
export function thunk<T,T0,T1,T2,T3,T4>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,cb:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4)=>TaskInstance<T>;
export function thunk<T,T0,T1,T2,T3,T4,T5>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,cb:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5)=>TaskInstance<T>;
export function thunk<T,T0,T1,T2,T3,T4,T5,T6>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,cb:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6)=>TaskInstance<T>;
export function thunk<T,T0,T1,T2,T3,T4,T5,T6,T7>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,cb:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7)=>TaskInstance<T>;
export function thunk<T,T0,T1,T2,T3,T4,T5,T6,T7,T8>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,cb:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8)=>TaskInstance<T>;
export function thunk<T,T0,T1,T2,T3,T4,T5,T6,T7,T8,T9>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,v9:T9,cb:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,v9:T9)=>TaskInstance<T>;
export function thunk<T,T0,T1,T2,T3,T4,T5,T6,T7,T8,T9,T10>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,v9:T9,v10:T10,cb:THUNKCB<T>)=>any):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,v9:T9,v10:T10)=>TaskInstance<T>;
export function thunk<T>(fn:(...argv:any[])=>any):(...argv:any[])=>TaskInstance<T>;
export function thunk<T>(fn:(...argv:any[])=>any):(...argv:any[])=>TaskInstance<T>
{
	return function*():TaskInstance<T>
	{
		let task = self();
		Array.prototype.push.call(arguments, task.resume_thunk);
		fn.apply(this, arguments);
		return yield Task.suspend(task);
	}
}

export function custom<T>(fn:()=>any,callback:CustomCallback<T>):()=>TaskInstance<T>;
export function custom<T,T0>(fn:(v0:T0)=>any,callback:CustomCallback<T>):(v0:T0)=>TaskInstance<T>;
export function custom<T,T0,T1>(fn:(v0:T0,v1:T1)=>any,callback:CustomCallback<T>):(v0:T0,v1:T1)=>TaskInstance<T>;
export function custom<T,T0,T1,T2>(fn:(v0:T0,v1:T1,v2:T2)=>any,callback:CustomCallback<T>):(v0:T0,v1:T1,v2:T2)=>TaskInstance<T>;
export function custom<T,T0,T1,T2,T3>(fn:(v0:T0,v1:T1,v2:T2,v3:T3)=>any,callback:CustomCallback<T>):(v0:T0,v1:T1,v2:T2,v3:T3)=>TaskInstance<T>;
export function custom<T,T0,T1,T2,T3,T4>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4)=>any,callback:CustomCallback<T>):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4)=>TaskInstance<T>;
export function custom<T,T0,T1,T2,T3,T4,T5>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5)=>any,callback:CustomCallback<T>):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5)=>TaskInstance<T>;
export function custom<T,T0,T1,T2,T3,T4,T5,T6>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6)=>any,callback:CustomCallback<T>):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6)=>TaskInstance<T>;
export function custom<T,T0,T1,T2,T3,T4,T5,T6,T7>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7)=>any,callback:CustomCallback<T>):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7)=>TaskInstance<T>;
export function custom<T,T0,T1,T2,T3,T4,T5,T6,T7,T8>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8)=>any,callback:CustomCallback<T>):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8)=>TaskInstance<T>;
export function custom<T,T0,T1,T2,T3,T4,T5,T6,T7,T8,T9>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,v9:T9)=>any,callback:CustomCallback<T>):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,v9:T9)=>TaskInstance<T>;
export function custom<T,T0,T1,T2,T3,T4,T5,T6,T7,T8,T9,T10>(fn:(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,v9:T9,v10:T10)=>any,callback:CustomCallback<T>):(v0:T0,v1:T1,v2:T2,v3:T3,v4:T4,v5:T5,v6:T6,v7:T7,v8:T8,v9:T9,v10:T10)=>TaskInstance<T>;
export function custom<T>(fn:(...argv:any[])=>any,callback:CustomCallback<T>):(...argv:any[])=>TaskInstance<T>;
export function custom<T>(fn:(...argv:any[])=>any,callback:CustomCallback<T>):(...argv:any[])=>TaskInstance<T>
{
	return function*():TaskInstance<T>
	{
		let task = self();
		Array.prototype.push.call(arguments, callback.bind(this, task.resume_thunk));
		fn.apply(this, arguments);
		return yield Task.suspend(task);
	}
}