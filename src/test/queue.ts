import * as plugtask from '../main';

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