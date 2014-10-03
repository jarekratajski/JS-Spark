module.exports = function dispatcher(log, ioServer, serializer, _) {

    // AKA clients
    var workers = [];

    // TODO: task clients send, recieved form clients,
    //TODO maybe tasks here are not required?
    var tasks = [];

    // maybe merge with tasks
    var promises = [];

    // probably not good idea
    var memoizedStringify = _.memoize(serializer.stringify);

    return {
        start: start,
        addTask: addTask
    };

    // public methods
    function start() {
        var handleMessage = function (socket) {
            log.info('New client of dispatcher ', socket.id);
            workers.push(socket);

            // drop old clients
            socket.on('disconnect', function () {
                var index = workers.indexOf(socket);
                if (index != -1) {
                    log.info('RIP client', socket.id);
                    workers.splice(index, 1);
                }
            });

            socket.on('clientError', function (data) {
                log.info('client ', socket.id, ', task ', data.id, ', reports error:', data.resp);
                //TODO check here validity
                promises[socket.id].reject(data.resp);
            });

            // TODO full fill q
            // process client response
            socket.on('response', function (data) {
                log.info('Client response ', socket.id);
                log.info('task id', data.id);
                log.info('data', data.resp);
                //TODO check here validity
                promises[socket.id].fulfill(data.resp);
            });

        };
        ioServer.on('connection', handleMessage);

    }

    // maybe better hashing algorithm than
    // consequent unique numbers + prefix
    function newUniqueTaskId(prefix) {
        return _.uniqueId(prefix);
    }

    // task schema
    function newTask(task, clientId) {
        clientId = clientId || '';

        return {
            id: newUniqueTaskId(clientId),
            task: memoizedStringify(task)
        }
    }

    // #TODO well, writer the correct dispatcher.
    // TODO check tasks, check resolved promises
    // setInterval -> event loop
    // spams clients with meaning-full task, like good PM
    function addTask(task, deferred) {
        tasks.push(newTask(task));

        setInterval(function () {
            var randomClient, workerId;

            if (!_.isEmpty(workers)) {
                randomClient = Math.floor(Math.random() * workers.length);
                workerId = workers[randomClient].id;
                workers[randomClient].emit(
                    'task', newTask(task, workerId)
                );
                promises[workerId] = deferred;
            }
        }, 10000);
    }

};
