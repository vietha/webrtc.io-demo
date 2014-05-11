var connect = require('connect');
var app = connect().use(connect.static(__dirname)).listen(2013);


var io = require('socket.io').listen(app);
io.sockets.on('connection', function(socket) {
    console.log("starting");
    function log() {
        var array = [">>> Message from server: "];
        for (var i = 0; i < arguments.length; i++) {
            array.push(arguments[i]);
        }
        socket.emit('log', array);
    }

    socket.on('message', function(message,user) {
        var room = user.room;
        log('Got message: ', message, "room=",room, " username=",user.username);
        io.sockets. in (room).emit('message', message, user);

    });
    socket.on('disconnect', function(){ 
        console.log("disconnect");
        var user = socket.user;
        if (user && user.room) io.sockets. in (user.room).emit('message', "bye",user);
    }),
    socket.on('playSound', function(user, username, value) {
        console.log("playSound:"+username);
        io.sockets. in (user.room).emit('playSound', username, value);
    }),
    socket.on('requestChat', function(user) {
        console.log("requestChat");
        io.sockets. in (user.room).emit('requestChat', user);
    }),    

    socket.on('connect', function(user) {
        var room = user.room;
        var numClients = io.sockets.clients(room).length;
        log('Room ' + room + ' has ' + numClients + ' client(s)');
        log('Request to create or join room', room);

        if (numClients == 0) {
            socket.user = user;
            socket.join(room);
            socket.emit('created', user);
        } else if (numClients == 1) {
            socket.user = user;
            io.sockets. in (room).emit('join', user);
            socket.join(room);
            socket.emit('joined', user);
        } else { // max two clients
            socket.emit('full', user);
        }
    });
});
