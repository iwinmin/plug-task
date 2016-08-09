// interface TaskInstance
export interface TaskInstance<T> extends IterableIterator<T> {
	is_async_iterator?: void;
	next(value: any): IteratorResult<any>;
	throw?(e: any): IteratorResult<any>;
	[Symbol.iterator](): TaskInstance<T>;
}

// Task Object
export interface TaskBase {
	id:number;
	result:any;
	callback_error:Function;
	callback_success:Function;
	exit(result?:any):boolean;
	detach():void;
	is_done():boolean;
	is_detach():boolean;
	join(task_id:number):void;
	suspend():boolean;
	get_data(key:string, default_value?:any):any;
	set_data(key:string, value:any):void;
	resume(is_error:boolean, data:any, do_run:boolean):void;
	run():void;
}

var TASK_ID = 1;
var CURRENT_TASK_INDEX:number = -1;
var CURRENT_TASK:TaskBase = null;
var ALL_TASKS:Map<number,TaskBase> = new Map<number,TaskBase>();
var RUNNING_TASKS:TaskBase[] = [];

var HR_TIME = ('object' == typeof process) && process.hrtime;
if (!HR_TIME)
{
	HR_TIME = function(start?:number[]) {
		let now = Date.now();
		if (start)
		{
			return [(now - start[0]) / 1000];
		}
		else
		{
			return [now];
		}
	}
}

// generate new task id
function new_id() {
	while (ALL_TASKS.has(TASK_ID))
	{
		TASK_ID = (TASK_ID & 0xfffffff) + 1;
	}
	return TASK_ID;
}

function remove_from_running(task:TaskBase)
{
	let idx = RUNNING_TASKS.indexOf(task);
	if (idx > -1)
	{
		RUNNING_TASKS.splice(idx, 1);
		if (idx === CURRENT_TASK_INDEX)
		{
			idx--;
		}
	}
}

function resume_tasks(ids:number[], is_error:boolean, result:any)
{
	while (ids.length > 0)
	{
		let task = ALL_TASKS.get(ids.shift());
		if (task)
		{
			task.resume(is_error, result, false);
		}
	}
}

// Task Status
const TASK_STATUS = {
	RUNNING: 1,
	PENDING: 2,
	EXITED: 3,
	DONE: 4
};

/**
 * Task
 */
class Task implements TaskBase {
	public id = new_id();
	public result:any = null;
	private is_error:boolean;
	private status = TASK_STATUS.RUNNING;
	private detached = false;
	private data:Map<string,any> = new Map<string,any>();
	private join_task_ids:number[] = [];
	public callback_success:Function;
	public callback_error:Function;
	constructor(
		private generator:TaskInstance<any>,
		private parent_tid:number,
		public comment?:string)
	{
		ALL_TASKS.set(this.id, this);
		RUNNING_TASKS.push(this);
		if (!this.comment)
		{
			this.comment = `Task<#${this.id}>`;
		}
		this.callback_success = (data:any) => {
			this.resume(false, data, true);
		}
		this.callback_error = (error:any, data:any) => {
			if (error)
			{
				this.resume(true, error, true);
			}
			else
			{
				this.resume(false, data, true);
			}
		}
	}

	public exit(result?:any)
	{
		if (this.is_done())
		{
			return false;
		}
		else
		{
			// remove this task from ALL_TASKS
			ALL_TASKS.delete(this.id);
			this.status = TASK_STATUS.EXITED;
			this.result = result;
			remove_from_running(this);
			resume_tasks(this.join_task_ids, true, result);
			run();
			return true;
		}
	}

	public detach()
	{
		this.parent_tid = 0;
		this.detached = true;
	}

	public is_done()
	{
		let s = this.status;
		return (s == TASK_STATUS.DONE || s == TASK_STATUS.EXITED);
	}

	public is_detach()
	{
		return this.detached;
	}

	public join(task_id:number)
	{
		if (this.join_task_ids.indexOf(task_id) == -1)
		{
			this.join_task_ids.push(task_id);
		}
	}

	public suspend()
	{
		if (this.status == TASK_STATUS.RUNNING)
		{
			this.status = TASK_STATUS.PENDING;
			remove_from_running(this);
			return true;
		}
		return false;
	}

	public resume(is_error:boolean, data:any, do_run:boolean)
	{
		if (this.status == TASK_STATUS.PENDING)
		{
			this.is_error = is_error;
			this.result = data;
			this.status = TASK_STATUS.RUNNING;
			RUNNING_TASKS.push(this);
			if (do_run)
			{
				run();
			}
		}
	}

	public get_data(key:string, default_value?:any)
	{
		let parent_task:TaskBase;
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

	public run()
	{
		let error = this.is_error;
		let result = this.result;
		let done = false;
		let gen = this.generator;
		let start_time = HR_TIME();
		do {
			try
			{
				result = error ? gen.throw(result) : gen.next(result);
				error = false;
				done = result.done;
				result = result.value;
				// check result value type
				if (!done)
				{
					if (result && result.then instanceof Function)
					{
						this.suspend();
						result.then(this.callback_success, this.callback_error);
						break;
					}
					continue;
				}
			}
			catch (err)
			{
				error = true;
				result = err;
			}
			// task code finish and exit
			ALL_TASKS.delete(this.id);
			this.status = TASK_STATUS.DONE;
			remove_from_running(this);
			resume_tasks(this.join_task_ids, error, result);
			if (error)
			{
				console.log(
					'%s uncaughtException:\n%s\n',
					this.comment,
					result.toString(),
					result
				);
			}
			break;
		} while (
			this.status === TASK_STATUS.RUNNING &&
			(RUNNING_TASKS.length === 1 ||
				HR_TIME(start_time)[0] < 1) // max run 1 seconds
		)
		this.is_error = error;
		this.result = result;
	}
}

export function throw_error(code:number):Error
{
	let message:string = [
		'Not in plug-task runtime context',
		'Task has detached'
	][code % 10];
	return new Error(`E${code}: ${message}`);
}

export function get(id:number):TaskBase
{
	return ALL_TASKS.get(id);
}

export function run()
{
	if (CURRENT_TASK_INDEX === -1)
	{
		while (RUNNING_TASKS.length > 0)
		{
			CURRENT_TASK_INDEX = (CURRENT_TASK_INDEX + 1) % RUNNING_TASKS.length;
			CURRENT_TASK = RUNNING_TASKS[CURRENT_TASK_INDEX];
			CURRENT_TASK.run();
		}
		CURRENT_TASK = null;
		CURRENT_TASK_INDEX = -1;
	}
}

// start a nwe task
export function start(generator:TaskInstance<any>, comment?:string):TaskBase
{
	let task = new Task(
		generator,
		CURRENT_TASK ? CURRENT_TASK.id : 0,
		comment
	);
	run();
	return task;
}

// get current task
export function self():TaskBase
{
	if (!CURRENT_TASK)
	{
		throw_error(100);
	}
	return CURRENT_TASK;
}

// get current task id
export function self_id():number
{
	if (!CURRENT_TASK)
	{
		throw_error(100);
	}
	return CURRENT_TASK.id;
}

// wait a sub task end
export function join(task:TaskBase)
{
	if (CURRENT_TASK_INDEX == -1)
	{
		throw_error(100);
	}
	else
	{
		if (task.is_done())
		{
			return task.result;
		}
		else if (task.is_detach())
		{
			throw_error(101);
		}
		else
		{
			// suspend current task
			task.join(CURRENT_TASK.id);
			CURRENT_TASK.suspend();
		}
	}
}

// wait all sub task end
export function* join_all(tasks:TaskBase[]):TaskInstance<void>
{
	for (let task of tasks)
	{
		yield join(task);
	}
}

// suspend task for certain time
export function sleep(ms:number)
{
	if (CURRENT_TASK)
	{
		setTimeout(CURRENT_TASK.callback_success, ms);
		CURRENT_TASK.suspend();
	}
	else
	{
		throw_error(100);
	}
}

// suspend current task
export function suspend():any
{
	if (CURRENT_TASK)
	{
		CURRENT_TASK.suspend();
	}
	else
	{
		throw_error(100);
	}
}

// get task private data
export function get_data(key:string, default_value?:any)
{
	if (CURRENT_TASK)
	{
		return CURRENT_TASK.get_data(key, default_value);
	}
	else
	{
		throw_error(100);
	}
}

// set task private data
export function set_data(key:string, value:any)
{
	if (CURRENT_TASK)
	{
		return CURRENT_TASK.set_data(key, value);
	}
	else
	{
		throw_error(100);
	}
}
