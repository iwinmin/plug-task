import * as plugtask from '../main';

// create a keeper queue with init item as a key
let keeper = new plugtask.Queue<string>(0, ['key']);

function* visitor(name:string):plugtask.TaskInstance<void>
{
  for (let time=1; time<=3; time++)
  {
    // before access the resource, get the keeper's key first
    let key = yield* keeper.get();
    // do a try/finally to make sure we wouldn't lose the key
    try {
      console.log('%s accessing the resource %d time', name, time);
      // simulate do some async job with the resource
      yield* plugtask.sleep(1000);
    }
    finally
    {
      // at last, return the key to the keeper
      console.log('%s return the key %d time', name, time);
      yield* keeper.put(key);
    }
  }
}

// create two visitor task
plugtask.start(visitor('jack'), 'visitor_jask');
plugtask.start(visitor('rose'), 'visitor_rose');