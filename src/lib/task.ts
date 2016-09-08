import { throw_error, CONFIG, hrtime, onException } from './util';
// interface TaskIterator
export interface TaskIterator<T> extends IterableIterator<T> {
	readonly [Symbol.toStringTag]?: "AsyncGeneratorIterator";
	next(value: any): IteratorResult<any>;
	throw?(e: any): IteratorResult<any>;
	[Symbol.iterator](): TaskIterator<T>;
}

// Task Status
const TASK_STAT = {
	SUSPEND: -1,
	RUNNING: 0,
	RESUMED: 1,
	DONE: -3,
	ERROR: -4,
	EXITED: -5,
};
var VOID:void;

// global runtime variable
var TASK_ID = 1;
var CURRENT_TASK_INDEX:number = -1;
var CURRENT_TASK:Task<any> = null;
var ALL_TASKS:Map<number,Task<any>> = new Map();
var RUNNING_TASKS:Task<any>[] = [];

// generate new task id
function new_id() {
	while (ALL_TASKS.has(TASK_ID))
	{
		TASK_ID = (TASK_ID & 0xfffffff) + 1;
	}
	return TASK_ID;
}

// remove a task from the running queue
function remove_from_running(task:Task<any>)
{
	let idx = RUNNING_TASKS.indexOf(task);
	if (idx > -1)
	{
		RUNNING_TASKS.splice(idx, 1);
		if (idx <= CURRENT_TASK_INDEX)
		{
			CURRENT_TASK_INDEX--;
		}
	}
}

// task dispatch routine
function run_tasks()
{
	if (CURRENT_TASK_INDEX === -1)
	{
		while (RUNNING_TASKS.length > 0)
		{
			CURRENT_TASK_INDEX = (CURRENT_TASK_INDEX + 1) % RUNNING_TASKS.length;
			CURRENT_TASK = RUNNING_TASKS[CURRENT_TASK_INDEX];
			Task.run(CURRENT_TASK);
		}
		CURRENT_TASK = null;
		CURRENT_TASK_INDEX = -1;
	}
}

// current task id
export function id()
{
	return CURRENT_TASK ? CURRENT_TASK.id : 0;
}

// get task of task_id
export function get(task_id:number):Task<any>
{
	return ALL_TASKS.get(task_id);
}

// get current task
export function self():Task<any>
{
	if (CURRENT_TASK){
		return CURRENT_TASK;
	}
	else
	{
		throw_error(100);
	}
}

/**
 * Task
 */
export class Task<T> implements PromiseLike<T> {
	public id = new_id();
	public code = 0;
	public error:any;
	public result:T;
	public is_error = false;
	public resume_success:(data?:any)=>void;
	public resume_thunk:(error:any, data?:any)=>void;

	private stat:number = TASK_STAT.RUNNING;
	private value:any;
	private data = new Map<string,any>();
	private join_task_ids:number[] = [];
	private promise:Promise<T>;
	private promise_callbacks:Function[];

	constructor(
		private generator:TaskIterator<T>,
		private parent_tid:number,
		public comment?:string)
	{
		ALL_TASKS.set(this.id, this);
		RUNNING_TASKS.push(this);
		if (!this.comment)
		{
			this.comment = `Task<#${this.id}>`;
		}
		this.resume_success = (data?:any) => {
			Task.resume(this, false, data);
			run_tasks();
		}
		this.resume_thunk = (error:any, data?:any) => {
			if (error)
			{
				Task.resume(this, true, error);
			}
			else
			{
				Task.resume(this, false, data);
			}
			run_tasks();
		}
		run_tasks();
	}

	public detach()
	{
		this.parent_tid = 0;
	}

	public is_detach()
	{
		return (this.parent_tid == 0);
	}

	public is_done()
	{
		return (this.stat <= TASK_STAT.DONE);
	}

	public get_data(key:string, default_value?:any):any
	{
		let parent_task:Task<any>;
		if (this.data.has(key))
		{
			return this.data.get(key);
		}
		else if (parent_task = ALL_TASKS.get(this.parent_tid))
		{
			return parent_task.get_data(key, default_value);
		}
		else
		{
			return default_value;
		}
	}

	public set_data(key:string, value:any)
	{
		this.data.set(key, value);
	}

	// promise like
	[Symbol.toStringTag]: "PlugTaskPromise";
	public then<TResult, TReject>(
		onfulfilled:(value:T)=>TResult | PromiseLike<TResult>,
		onrejected?:(reason:any)=>TReject | PromiseLike<TReject>
	):PromiseLike<TResult>
	{
		if (!this.promise)
		{
			Task.create_promise(this);
		}
		return this.promise.then(onfulfilled, onrejected);
	}
	public catch<TReject>(onrejected?: (reason: any) => TReject | PromiseLike<TReject>): PromiseLike<TReject>
	{
		if (!this.promise)
		{
			Task.create_promise(this);
		}
		return this.promise.catch(onrejected);
	}

	// add a waiting task id to current task
	// private api, do not use directly
	static add_join_id(self:Task<any>, task_id:number)
	{
		if (self.join_task_ids.indexOf(task_id) == -1)
		{
			self.join_task_ids.push(task_id);
		}
	}

	// suspend a task
	// private api, do not use directly
	static suspend(self:Task<any>)
	{
		// if (self.status == TASK_STATUS.RUNNING)
		switch (self.stat)
		{
			case TASK_STAT.RUNNING:
				self.stat = TASK_STAT.SUSPEND;
				remove_from_running(self);
				return;
			case TASK_STAT.RESUMED:
				self.stat = TASK_STAT.RUNNING;
				return self.value;
		}
	}

	// resume a task with
	static resume(self:Task<any>, is_error:boolean, data:any)
	{
		// save last resume result
		self.is_error = is_error;
		self.value = data;
		// change task stat
		switch (self.stat)
		{
			case TASK_STAT.SUSPEND:
				self.stat = TASK_STAT.RUNNING;
				RUNNING_TASKS.push(self);
				break;
			case TASK_STAT.RUNNING:
				self.stat = TASK_STAT.RESUMED;
				break;
		}
	}

	static exit(self:Task<any>, code?:number, error?:any)
	{
		// remove current task from ALL_TASKS
		self.code = code || 0;
		self.error = error;
		Task.finish_task(self, TASK_STAT.EXITED, true, error);
		run_tasks();
	}

	// run a task
	static run(self:Task<any>)
	{
		let start_ts = CONFIG.switch_time ? hrtime() : null;
		let gen = self.generator;

		try
		{
			let data = self.value;
			self.value = VOID;
			do {
				let is_error = self.is_error;
				self.is_error = false;
				let result = is_error ? gen.throw(data) : gen.next(data);
				data = result.value;
				if (result.done)
				{
					// task done
					self.result = data;
					Task.finish_task(self, TASK_STAT.DONE, false, data);
					return;
				}
				if (data && data.then instanceof Function)
				{
					// yield value is promise like object
					data.then(self.resume_success, self.resume_thunk);
					data = Task.suspend(self);
				}
			} while (
				self.stat === TASK_STAT.RUNNING &&
				// if more than 1 task, each task max run 1 seconds
				(!start_ts || RUNNING_TASKS.length === 1 ||
					hrtime(start_ts)[0] < CONFIG.switch_time)
			)
			// async wait or switch task, save current value
			switch (self.stat)
			{
				// case TASK_STAT.SUSPEND:
				// do nothing, wait resume callback
				case TASK_STAT.RUNNING:
					// switch time timeout, save current data
					self.value = data;
					break;
				case TASK_STAT.RESUMED:
					// should not resume without suspend call, throw error
					throw_error(102);
					break;
			}
		}
		catch (err)
		{
			// uncaught exception error
			self.code = -1;
			self.error = err;
			Task.finish_task(self, TASK_STAT.ERROR, true, err);
		}
	}

	// finish a task, and put it back to the running queue
	static finish_task(self:Task<any>, stat:number, is_error:boolean, value:any)
	{
		// save the result to the task
		self.stat = stat;
		self.value = VOID;
		self.generator = null;
		self.is_error = is_error;

		// remove task from queue list
		ALL_TASKS.delete(self.id);
		remove_from_running(self);

		// wake up all joined task
		let ids = self.join_task_ids;
		while (ids.length > 0)
		{
			let task = ALL_TASKS.get(ids.shift());
			if (task)
			{
				Task.resume(task, false, VOID);
			}
		}

		// call the promise callback function
		let cbs = self.promise_callbacks;
		if (cbs)
		{
			self.promise_callbacks = null;
			cbs[is_error?1:0](value);
		}

		// trigger task error exception
		if (is_error && value && !self.promise)
		{
			onException(self.comment, value);
		}
	}

	// create and return a task's promise object
	static create_promise<TT>(self:Task<TT>)
	{
		self.promise = new Promise<TT>(function(resolve, reject)
		{
			if (!self.is_done())
			{
				self.promise_callbacks = [resolve, reject];
			}
			else if (self.is_error)
			{
				reject(self.error);
			}
			else
			{
				resolve(self.result);
			}
		});
	}
}
