import { TaskInstance, self_id, suspend, get } from './task';

/**
 * Queue
 */
export class Queue<T> {
	private queues:T[] = [];
	private current = 0;
	private put_waits:number[] = [];
	private get_waits:number[] = [];

	constructor(size:number);
	constructor(size:number, values:T[]);
	constructor(size:number, init:number, value?:T);
	constructor(private size:number, init?:any, value?:T)
	{
		if (init)
		{
			if (typeof init == 'number')
			{
				while (init --> 0)
				{
					this.queues.push(value);
				}
			}
			else
			{
				this.queues = init.slice(0);
			}
		}
		this.current = this.queues.length;
	}

	*put(value:T):TaskInstance<number>
	{
		if (this.size > 0 && this.current >= this.size)
		{
			// size queue, and current queue is full, put current task to wait
			this.put_waits.push(self_id());
			yield suspend();
			this.queues.push(value);
			return this.current;
		}

		// resume get wait task, direct send the value to the get task
		while (this.get_waits.length > 0)
		{
			let tid = this.get_waits.shift();
			let cur = get(tid);
			if (cur)
			{
				cur.resume(false, value, true);
				return 0;
			}
		}

		// cache the value
		this.queues.push(value);
		return ++this.current;
	}

	*get():TaskInstance<T>
	{
		if (this.current <= 0)
		{
			// waiting queue put
			this.get_waits.push(self_id());
			return yield <T>suspend();
		}

		// resume put wait task
		while (this.put_waits.length > 0)
		{
			let tid = this.put_waits.shift();
			let cur = get(tid);
			if (cur)
			{
				let value = this.queues.shift();
				cur.resume(false, null, true);
				return value;
			}
		}

		// reduce wait task count, and return one queue;
		this.current--;
		return this.queues.shift();
	}
}