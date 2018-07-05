import { Task, TaskIterator, get, self } from './task';
import { self_id, suspend, wait } from './api';

/**
 * Queue
 */
export class Queue<T> {
	private queues:T[];
	private put_waits:number[] = [];
	private get_waits:number[] = [];

	constructor(size:number);
	constructor(size:number, values:T[]);
	constructor(size:number, fill:number, value?:T);
	constructor(private size:number, init?:any, value?:T)
	{
		if (init instanceof Array)
		{
			this.queues = init.slice(0);
		}
		else
		{
			this.queues = [];
			if (typeof init == 'number')
			{
				while (init --> 0)
				{
					this.queues.push(value);
				}
			}
		}
	}

	*put(value:T):TaskIterator<number>
	{
		if (this.size > 0 && this.queues.length >= this.size)
		{
			// size queue, and current queue is full,
			// put current task to wait
			this.put_waits.push(self_id());
			// suppend current task
			yield* suspend();
		}

		// resume get wait task, direct send the value to the get task
		while (this.get_waits.length > 0)
		{
			let tid = this.get_waits.shift();
			let get_task = get(tid);
			if (get_task)
			{
				get_task.resume_success(value);
				return 0;
			}
		}

		// cache the value
		return this.queues.unshift(value);
	}

	*push(value:T):TaskIterator<number>
	{
		if (this.size > 0 && this.queues.length >= this.size)
		{
			// size queue, and current queue is full,
			// put current task to wait
			this.put_waits.push(self_id());
			// suppend current task
			yield* suspend();
		}

		// resume get wait task, direct send the value to the get task
		while (this.get_waits.length > 0)
		{
			let tid = this.get_waits.shift();
			let get_task = get(tid);
			if (get_task)
			{
				get_task.resume_success(value);
				return 0;
			}
		}

		// cache the value
		return this.queues.push(value);
	}

	*get():TaskIterator<T>
	{
		if (this.queues.length <= 0)
		{
			// waiting queue put
			this.get_waits.push(self_id());
			return yield* wait<T>();
		}

		// resume put wait task
		while (this.put_waits.length > 0)
		{
			let tid = this.put_waits.shift();
			let put_task = get(tid);
			if (put_task)
			{
				put_task.resume_success();
				break;
			}
		}

		// reduce wait task count, and return one queue;
		return this.queues.pop();
	}

	*tryget():TaskIterator<T>
	{
		if (this.queues.length > 0)
		{
			return yield* this.get();
		}
		else
		{
			return null;
		}
	}
}