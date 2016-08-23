# plug-task
> ECMASCRIPT6 Javascript multiply task module

## v0.2.0 changelog
- complete the test case and examples
- massive change to the api, make it more standard
- complete the [API](#api) document
- complete [Queue Class api](#queue-module) document

## Installation
```
$ npm install --save plug-task
```

## Examples
```typescript
import * as plugtask from 'plug-task';

function* subtask(id:number):plugtask.TaskInstance<number>
{
  console.log('<subtask %d> started', id);

  // use yield* to delegate a sub generator function
  // will return the final result, and you can catch the exception from it
  console.log('<subtask %d> start async_call()', id);
  let result = yield* async_call(id);
  console.log('<subtask %d> async_call() return: %s', id, result);

  // use api sleep() to make current task sleep certain time
  yield* plugtask.sleep(id * 1000);
  console.log('<subtask %d> end', id);
  return 100 + id;
}

// generator function can also use the plugtask api function
function* async_call(id:number):plugtask.TaskInstance<string>
{
  yield* plugtask.sleep(id * 1000);
  if (id % 2)
  {
    // task will exit when id is an odd number
    yield* plugtask.exit(id, new Error('plugtask EXIT'));
  }
  return `call ${id} finish`;
}

// promise task for test the promise functionality
function* promise_task(mode:number):plugtask.TaskInstance<string>
{
  yield* plugtask.sleep(1000);
  if (mode % 2)
  {
    throw new Error(`promise exception ${mode}`);
  }
  else
  {
    return `promise value ${mode}`;
  }
}

// main task generator function
function* main_task():plugtask.TaskInstance<void>
{
  console.log('<main_task> start');
  // create a sub task, you can name it a thread or a fiber
  var task0 = plugtask.start(subtask(0));
  // use api join() to wait the task instance end
  // you can get the task instance return value from the result property
  yield* plugtask.join(task0);
  console.log('<main_task> task0 end with result:', task0.result);

  // task instance can exit with the api exit(code, error?)
  // join() will return the exit_code that provided by exit()
  // task1 will exit at async_call() with and Error('exit with error')
  // if task code throw an uncaught exception, task will exit with code -1 and
  // the exception as the error
  var task1 = plugtask.start(subtask(1));
  let error_code = yield* plugtask.join(task1);
  console.error(
    `<main_task> task1 exited: %s [code: %d]`,
    task1.error.toString(), error_code
  );
  console.log('---- join() api test end ----\n');

  // api start() will return a Task class object, and it is a promise like object
  // so you can use the promise method to handle the task return value or catch exception
  var task2 = plugtask.start(promise_task(0));
  task2.then((value) => {
    console.log(`<main_task> task2.then() value: ${value}`);
  });
  var task3 = plugtask.start(promise_task(1));
  task3.catch((err) => {
    console.error('<main_task> task3.catch() got exception:', err);
  });

  // like other promise, callback function will run in asynchronous
  console.log('---- main_task will not wait promise callback done ----');
  yield* plugtask.sleep(1500);
  console.log('---- promise like api test end ----\n');

  // in task generator you can yield a promise
  try {
    // yield will wait and return the promise result
    var result = yield new Promise<string>((resolve) => {
      setTimeout(() => { resolve('promise resolved'); }, 1000);
    });
    console.log('<main_task> yield promise and get the result: %s', result);

    // if the promise rejected, will throw a exception of the reject resaon
    let error = yield Promise.reject('promise rejected');
    console.log('<main_task> should not run this code');
  }
  catch (err)
  {
    // you can try/catch the promise exception error
    console.error('<main_task> yield promise throw error: ', err);
  }
  console.log('---- yield promise test end ----\n');

  // as you know task object is a promise like object, you absolutely
  // can yield the task instance object and get task return or catch the error
  // but the best way is use yield* to delegate the generator directly
  try {
    var value = yield plugtask.start(promise_task(2));
    console.log(`<main_task> yield task return value: ${value}`);
  }
  catch (err)
  {
    // modiy the promise_task param value to even number to get throw an error
    console.log(`<main_task> yield task throw an error: `, err);
  }
  console.log('---- yield Task object test end ----\n');

  // sync multiple tasks return
  var tasks = [
    // task will return a normal result
    plugtask.start(subtask(2)),
    // task will exit with an error
    plugtask.start(subtask(3)),
    // task throw an exception and exit
    plugtask.start(promise_task(3)),
  ];
  // wait all tasks end and return the exit code array
  let codes = yield* plugtask.join_all(tasks);
  console.log('<main_task> tasks exit code is: ', codes);

  console.log('<main_task> finish');
}

// handle the task uncaughtException, just hide it
plugtask.setExceptionHaldler(()=>{});

// start to run the first main task
plugtask.start(main_task());
```
**Output**
```
<main_task> start
<subtask 0> started
<subtask 0> start async_call()
<subtask 0> async_call() return: call 0 finish
<subtask 0> end
<main_task> task0 end with result: 100
<subtask 1> started
<subtask 1> start async_call()
<main_task> task1 exited: Error: plugtask EXIT [code: 1]
---- join() api test end ----

---- main_task will not wait promise callback done ----
<main_task> task2.then() value: promise value 0
<main_task> task3.catch() got exception: [Error: promise exception 1]
---- promise like api test end ----

<main_task> yield promise and get the result: promise resolved
<main_task> yield promise throw error:  promise rejected
---- yield promise test end ----

<main_task> yield task return value: promise value 2
---- yield Task object test end ----

<subtask 2> started
<subtask 2> start async_call()
<subtask 3> started
<subtask 3> start async_call()
<subtask 2> async_call() return: call 2 finish
<subtask 2> end
<main_task> tasks exit code is:  [ 0, 3, -1 ]
<main_task> finish
```

## Yieldables
plug-task support `yield` anything you want, but only handle `Promise object`,
plug-task will suspend current task and wait for the resolve/reject of the Promise
object, then continue task with the value of the Promise object. otherwise will
return back the value what you yield.

when you `yield` something out, then the plug-task core will take control the
program running, plug-task can handle the async call, or switch the running task,
make sure every task will has chance to be execute.

## Delegation generator
use `yield *` to delegate another generator, and return the generator's return
value.


## API

### start(fn*[, task_name])
create and run a task

name | type | comment
--- | --- | ---
__fn*__ | `generator` | task code that control the task program doing
__task_name__ | `string` | task name string, can make debug message more readable
||
*RETURN* | `Task` | a promise like Task Class object, can use it to do some task synchronization


### self_id()
return current task id

name | type | comment
--- | --- | ---
*RETURN* | `number` | current task id


### *exit([code=0, [error]])
exit current task, and return a error_code and error object

name | type | comment
--- | --- | ---
__code__ | `number` | exit code set to `task.code`
__error__ | `any` | anything set to the `task.error`


### *join(task)
wait the task end, and return the task exit code

name | type | comment
--- | --- | ---
__task__ | `Task` | task instance to wait
||
*RETURN* | `number` | task exit code


### *join_all(tasks)
wait all tasks end, and return an array of tasks exit code

name | type | comment
--- | --- | ---
__tasks__ | `Task[]` | array of tasks instance object
||
*RETURN* | `number[]` | array of tasks exit code


### *sleep(time)
current task sleep certain time

name | type | comment
--- | --- | ---
__time__ | `number` | millisecond to sleep


### *suspend()
suspend current task instance, a suspend task can wakeup by calling
`task.resume_success()` or `task.resume_error()`


### *wait()
suspend current task instance, and return `task.resume_success(value)`
param value.


### set_data(key, value)
set task private data name as `key` with `value`, task private data is
independent in each task instance, you can has same name but different
value in different task. useful for store global data by task.

name | type | comment
--- | --- | ---
__key__ | `string` | name string to be set
__value__ | `any` | value to set to name as `key`


### get_data(key[, default_value])
get a value name `key` from task private data object, like thread variable
if key not found in current task instance, plug-task will try to find from
parent task of current task.

name | type | comment
--- | --- | ---
__key__ | `string` | name string to be get
__default_value__ | `any` | default value return if no key value found
||
*RETURN* | `any` | value of key or default_value


### config([options])
set plug-task core configuration, will return the last configuration object.
if not supply the options param, will juet return current configuration object.

name | type | comment
--- | --- | ---
__options__ | `TaskConfig` | configuration object
||
*RETURN* | `TaskConfig` | last/current configuration object

**`TaskConfig`**

property | type | comment
--- | --- | ---
__switch_time__ | `number` | task max continue run time by `second`, 0 turn off task time switching


### setExceptionHandler(handler)
set a callback handler function to process the uncaughtException of task code,
if non `ExceptionHandler` is set, plug-task core will print the error through
`console.error()` as default.

name | type | comment
--- | --- | ---
__handler__ | `function` | callback function with type `function(error){}`
||
*RETURN* | `function` | return the last handler callback function


## Util API

### wrap(fn)
Convert a `fn(...args, success_callback(data), error_callback(err))` function
to a `TaskInstance` generator function.

name | type | comment
--- | --- | ---
__fn__ | `function` | function accept two callback function
||
*RETURN* | `generator` | arguments as fn but without callbacks, return success callback data, and throw the error_callback error


### thunk(fn)
Convert a thunk function `fn(...args, callback(error, data))` function to a
`TaskInstance` generator function.

name | type | comment
--- | --- | ---
__fn__ | `function` | thunk function
||
*RETURN* | `generator` | arguments as fn but without callback, if callback with error will throw out, and return the callback's data


### custom(fn, callback2thunk)
Convert a custom callback function to a `TaskInstance` generator function.
use a custom callback2thunk function to convert the function callback
to a thunk callback standard.

name | type | comment
--- | --- | ---
__fn__ | `function` | function that use custom callback format function
__callback2thunk__ | `function` | first param accept a thunk_callback format function, rest params as the fn's callback function arguments
||
*RETURN* | `generator` | arguments as fn but without callback, if callback with error will throw out, and return the callback's data

**NodeJS fs.write example**

```js
var fs = require('fs');
var plugtask = require('plug-task');

var fs_write = plugtask.custom(fs.write, function(thunk_cb, err, written, buffer){
  // covert written and buffer into an array data
  thunk_cb(err, [written, buffer]);
});

function* main(){
  let fp = fs.openSync('test.txt', 'a');
  try {
    // destruct the return value
    let [ written, buffer ] = yield* fs_write(fp, 'test string\n');
    console.log('%d bytes written to file', written);
  }
  catch (err)
  {
    console.log('write file error');
  }
}
plugtask.start(main());
```


## Queue Module
```
A synchronization Queue base on plug-task.
you can use Queue to sync task's produce data and consuming data simply
```

### new Queue(size[, values])
### new Queue(size, fill, value)
Create a value queue object.

name | type | comment
--- | --- | ---
__size__ | `number` | Queue size, how many item could hold in queue cache. 0 mean no limit
__values__ | `array` | init queue cache items with this array values
__fill__ | `number` | how many item fill into the cache at init
__value__ | `any` | value that fill into the cache list
||
*RETURN* | `Queue` | Queue object


### Queue.*get()
get a queue item, if queue is empty, will suspend current task and wait

name | type | comment
--- | --- | ---
*RETURN* | `any` | queue item


### Queue.*put(value)
put a item into queue, if queue has size limit and queue is full, will suspend current task and wait

name | type | comment
--- | --- | ---
__value__ | `any` | item value need to put into queue
||
*RETURN* | `number` | return current queue items count


### Queue.*tryget()
get a queue item like get, but if queue is empty, method will return `null` without wait

name | type | comment
--- | --- | ---
*RETURN* | `any` | queue item or `null` mean no queue empty


### Queue Examples

#### Synchronization tasks
```typescript
import * as plugtask from 'plug-task';

var queue = new plugtask.Queue<number>(2);

function* producer():plugtask.TaskInstance<void>
{
  var id = 1;
  while (true)
  {
    console.log('put [ %d ] into queue', id);
    yield* queue.put(id++);
  }
}

function* consumer(id:number):plugtask.TaskInstance<void>
{
  var time = 3;
  while (time --> 0)
  {
    let num = yield* queue.get();
    console.log('queue<%d> get [ %d ] from queue', id, num);
    yield* plugtask.sleep(1000);
  }
}

// create one producer task, produce numbers as soon as possible
plugtask.start(producer(), 'producer');
// create two consumer task, get 1 number per second, get 3 number at most
plugtask.start(consumer(1), 'consumer_1');
plugtask.start(consumer(2), 'consumer_2');
```

##### Result
> producer task will put 2 number into queue, and queue will be fulled,
> producer will suspend, two consumer task start get number from queue,
> after a consumer get a number, producer will wakeup and put a new number.

```
put [ 1 ] into queue
put [ 2 ] into queue
put [ 3 ] into queue
queue<1> get [ 1 ] from queue
put [ 4 ] into queue
queue<2> get [ 2 ] from queue
put [ 5 ] into queue
queue<1> get [ 3 ] from queue
put [ 6 ] into queue
queue<2> get [ 4 ] from queue
put [ 7 ] into queue
queue<1> get [ 5 ] from queue
put [ 8 ] into queue
queue<2> get [ 6 ] from queue
put [ 9 ] into queue
```

#### Resource Locker

```typescript
import * as plugtask from 'plug-task';

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
```

##### Result
> jack and rose access the resource one by one

```
jack accessing the resource 1 time
jack return the key 1 time
rose accessing the resource 1 time
rose return the key 1 time
jack accessing the resource 2 time
jack return the key 2 time
rose accessing the resource 2 time
rose return the key 2 time
jack accessing the resource 3 time
jack return the key 3 time
rose accessing the resource 3 time
rose return the key 3 time
```
