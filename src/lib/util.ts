const MESSAGES:string[] = [
	'Not in plug-task runtime context',
	'Task has detached',
	'Task resumed with out suspend'
];
export function throw_error(code:number):Error
{
	return new Error(`E${code}: ${MESSAGES[code % 10]}`);
}

// calculate the time duration, make sure ervery task has chance to run
var time_fn = ('object' == typeof process) && process.hrtime;
if (!time_fn)
{
	time_fn = function(start?:number[]) {
		let now = Date.now()/1000;
		if (start)
		{
			return [now - start[0]];
		}
		else
		{
			return [now];
		}
	}
}
export var hrtime = time_fn;

export interface TaskConfig {
	switch_time: number;
}
export var CONFIG:TaskConfig = {
	switch_time: 1
};
export function config(options:TaskConfig):TaskConfig
{
	let last = CONFIG;
	if (options)
	{
		CONFIG = options;
	}
	return last;
}

export interface ExceptionHandler {
	(error:any, name?:string):any;
}
var ON_EXCEPTION:ExceptionHandler;
export function setExceptionHandler(handler:ExceptionHandler):ExceptionHandler
{
	let last = ON_EXCEPTION;
	ON_EXCEPTION = handler;
	return last;
}
export function onException(name:string, error:any):void
{
	if (ON_EXCEPTION)
	{
		ON_EXCEPTION(error, name);
	}
	else
	{
		console.log(
			name + ' uncaughtException:\n%s\n',
			(error.stack || error.toString())
		);
	}
}