# plug-task
> ECMASCRIPT6 Javascript multiply task module

## Installation
```
$ npm install --save plug-task
```

## Usage
```js
var plug_task = require('plug-task');

function* async_call(id)
{
  // sub generator function can also use the async function
  yield plug_task.sleep((id + 1) * 1000);
  if (id % 2)
  {
    throw new Error(`call ${id} throw error`);
  }
  else
  {
    return `call ${id} finish`;
  }
}

function* sub_task(id)
{
  console.log('subtask %d started', id);
  yield plug_task.sleep(id * 1000);
  // generator function can use yield* to get the final result
  var result;
  try
  {
    result = yield* async_call(id);
  }
  catch (err)
  {
    result = err;
  }
  console.log('call result: %s', result);
  console.log('subtask %d waked', id);
  return id;
}

function* task(){
  // create a sub_task, and wait
  var task = plug_task.start(sub_task(4));
  plug_task.join(task);
  console.log('subtask end with result', task.result);

  // use yield to get the Promise final result
  try {
    var result = yield Promise.resolve('promise data');
    console.log('wait promise and get the result: %s', result);
  }
  catch (err)
  {
    console.log('here can catch the promise error', err);
  }

  // create 3 tasks and wait all tasks finish
  var tasks = [];
  for (var i=0; i<3; i++)
  {
    tasks.push(plug_task.start(sub_task(i)));
  }
  plug_task.join_all(tasks);
  console.log('main task finish');
}

plug_task.start(task(), 'main task');
```

## Yieldables
plug-task support `yield` anything you want, but only handle `Promise object`,
plug-task will suppend current task and wait for the completion of the Promise
object, then continue task with the value of the Promise object. otherwise will
return back the value you yield.

the main role of `yield` is hand over the program control to plug-task routine,
and then plug-task can decide to switch to other task.

## Delegation generator
use `yield *` to delegate another generator, and return the generator's return
value.