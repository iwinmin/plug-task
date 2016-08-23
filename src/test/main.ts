import * as plugtask from '../main';

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
plugtask.setExceptionHandler(()=>{});

// start to run the first main task
plugtask.start(main_task());