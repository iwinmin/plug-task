import { self, throw_error } from './task';

// callback function warp helper
// add two callback function after arguments
// arguments...<success_callback>, <error_callback>
export function warp(fn:Function):Function
{
	return function ()
	{
		let task = self();
		if (task)
		{
			Array.prototype.push.call(arguments, task.callback_success, task.callback_error);
			fn.apply(this, arguments);
			task.suspend();
		}
		else
		{
			throw_error(100);
		}
	}
}

// thunk like function callback warp helper
// add one callback function after arguments
// arguments...<callback(error, data)>
export function thunk(fn:Function):Function
{
	return function ()
	{
		let task = self();
		if (task)
		{
			Array.prototype.push.call(arguments, task.callback_error);
			fn.apply(this, arguments);
			task.suspend();
		}
		else
		{
			throw_error(100);
		}
	}
}

export type CustomCallback = (err_cb:Function, succ_cb:Function, ...fn_data:any[]) => void;
export function custom(fn:Function, callback:CustomCallback):Function
{
	return function ()
	{
		let task = self();
		if (task)
		{
			Array.prototype.push.call(
				arguments,
				callback.bind(this, task.callback_error, task.callback_success)
			);
			fn.apply(this, arguments);
			task.suspend();
		}
		else
		{
			throw_error(100);
		}
	}
}