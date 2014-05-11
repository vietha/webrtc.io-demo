
var express = require('express');
var app = express();
var app = require('express')();
var server = require('http').createServer(app);
var port = process.env.PORT || 8888;
server.listen(port);

app.use(express.directory(__dirname));
app.use(express.static(__dirname));

var webRTC = require('webrtc.io').listen(server);


webRTC.rtc.on('user_update', function(data, socket) {
	console.log('on user_update event from: ' + data.user.username);

    var roomList = webRTC.rtc.rooms[data.room] || [];

    for (var i = 0; i < roomList.length; i++) {
      var socketId = roomList[i];
      if (socketId !== socket.id) {
        var soc = webRTC.rtc.getSocket(socketId);
	  
        if (soc) {
          soc.send(JSON.stringify({
            "eventName": "user_update",
            "data": {
              "user": data.user,
              "room": data.room
            }
          }), function(error) {
            if (error) {
              console.log(error);
            }
          });
        }
      }
   }
});

webRTC.rtc.on('chat_msg', function(data, socket) {
  var roomList = webRTC.rtc.rooms[data.room] || [];

  for (var i = 0; i < roomList.length; i++) {
    var socketId = roomList[i];

    if (socketId !== socket.id) {
      var soc = webRTC.rtc.getSocket(socketId);

      if (soc) {
        soc.send(JSON.stringify({
          "eventName": "receive_chat_msg",
          "data": {
            "messages": data.messages,
            "color": data.color
          }
        }), function(error) {
          if (error) {
            console.log(error);
          }
        });
      }
    }
  }
});

