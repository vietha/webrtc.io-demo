var videos = [];
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection || window.RTCPeerConnection;
var localStream;
var remoteStream;
var timer;
var room;

function formatSeconds(time) {
	var mins = ~~(time / 60);
	var secs = time % 60;
	var mins = ~~((time % 3600) / 60);
	var secs = time % 60;

	var ret = "";
	ret += "" + mins + ":" + (secs < 10 ? "0" : "");
	ret += "" + secs;
	return ret;
}


function updateTimer() {
	myuser.seconds++;
	$("#spanTimer").text("Time:"+formatSeconds(myuser.seconds));
}

function endChat(user) {
  hisuser = {};
  console.log('connection closed');
  $("#remoteVideo").hide("slow");
  $("#spanUser").text("");
  $("#spanTimer").text("");
  removeUser(user);
  clearInterval(timer)
}

function removeUser(user) {
  //$("#item_"+user.username).remove();
  delete users[user.username]; 
  clearInterval(timer)

}

function addUser(user) {
  users[user.username] = user;
}


function getNumPerRow() {
  var len = videos.length;
  var biggest;

  // Ensure length is even for better division.
  if(len % 2 === 1) {
    len++;
  }

  biggest = Math.ceil(Math.sqrt(len));
  while(len % biggest !== 0) {
    biggest++;
  }
  return biggest;
}

function subdivideVideos() {
  var perRow = getNumPerRow();
  var numInRow = 0;
  for(var i = 0, len = videos.length; i < len; i++) {
    var video = videos[i];
    setWH(video, i);
    numInRow = (numInRow + 1) % perRow;
  }
  $("#you").hide();
  $("#you").show("slow");  
}

function setWH(video, i) {
  var perRow = getNumPerRow();
  var perColumn = Math.ceil(videos.length / perRow);
  var width = Math.floor((window.innerWidth) / perRow);
  var height = Math.floor((window.innerHeight - 190) / perColumn);
  video.width = width;
  video.height = height;
  video.style.position = "absolute";
  video.style.left = (i % perRow) * width + "px";
  video.style.top = Math.floor(i / perRow) * height + "px";
}

function cloneVideo(domId, socketId) {
  var video = document.getElementById(domId);
  var clone = video.cloneNode(false);
  clone.id = "remote" + socketId;
  document.getElementById('videos').appendChild(clone);
  videos.push(clone);
  return clone;
}

function removeVideo(socketId) {
  var video = document.getElementById('remote' + socketId);
  if(video) {
    videos.splice(videos.indexOf(video), 1);
    video.parentNode.removeChild(video);
  }
}

function addToChat(msg, color) {
  var messages = document.getElementById('messages');
  msg = sanitize(msg);
  if(color) {
    msg = '<span style="color: ' + color + '; padding-left: 15px">' + msg + '</span>';
  } else {
    msg = '<strong style="padding-left: 15px">' + msg + '</strong>';
  }
  messages.innerHTML = messages.innerHTML + msg + '<br>';
  messages.scrollTop = 10000;
}

function sanitize(msg) {
  return msg.replace(/</g, '&lt;');
}

function initFullScreen() {
  var button = document.getElementById("fullscreen");
  button.addEventListener('click', function(event) {
    var elem = document.getElementById("videos");
    //show full screen
    elem.webkitRequestFullScreen();
  });
}

function initNewRoom() {
  var button = document.getElementById("newRoom");

  button.addEventListener('click', function(event) {

    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var string_length = 8;
    var randomstring = '';
    for(var i = 0; i < string_length; i++) {
      var rnum = Math.floor(Math.random() * chars.length);
      randomstring += chars.substring(rnum, rnum + 1);
    }

    window.location.hash = randomstring;
    location.reload();
  })
}

function sendUserUpdate(){
  var message = JSON.stringify({
        "eventName": "user_update",
        "data": {
          "user": myuser,
          "room": room
        }
      });
  console.log('Client sending user update: ' + message);
  rtc._socket.send(message);
}


var websocketChat = {
  send: function(message) {
    rtc._socket.send(message);
  },
  recv: function(message) {
    return message;
  },
  event: 'receive_chat_msg'
};

var dataChannelChat = {
  send: function(message) {
    for(var connection in rtc.dataChannels) {
      var channel = rtc.dataChannels[connection];
      channel.send(message);
    }
  },
  recv: function(channel, message) {
    return JSON.parse(message).data;
  },
  event: 'data stream data'
};

function initChat() {
  var chat;

  if(rtc.dataChannelSupport) {
    console.log('initializing data channel chat');
    chat = dataChannelChat;
  } else {
    console.log('initializing websocket chat');
    chat = websocketChat;
  }

  var input = document.getElementById("chatinput");
  var toggleHideShow = document.getElementById("hideShowMessages");
  var room = window.location.hash.slice(1);
  var color = "#" + ((1 << 24) * Math.random() | 0).toString(16);

  toggleHideShow.addEventListener('click', function() {
    var element = document.getElementById("messages");

    if(element.style.display === "block") {
      element.style.display = "none";
    }
    else {
      element.style.display = "block";
    }

  });

  input.addEventListener('keydown', function(event) {
    var key = event.which || event.keyCode;
    if(key === 13) {
      chat.send(JSON.stringify({
        "eventName": "chat_msg",
        "data": {
          "messages": input.value,
          "room": room,
          "color": color
        }
      }));
      addToChat(input.value);
      input.value = "";
    }
  }, false);
  rtc.on(chat.event, function() {
    var data = chat.recv.apply(this, arguments);
    console.log(data.color);
    addToChat(data.messages, data.color.toString(16));
  });
}


function toggleSound(stream) { // stream is your local WebRTC stream
  var audioTracks = stream.getAudioTracks();
  for (var i = 0, l = audioTracks.length; i < l; i++) {
    audioTracks[i].enabled = !audioTracks[i].enabled;
  }
}

function initUIFunction() {
  $("#closeBtn").click(function() {
    location.reload();
  });
  $("#muteMicro").click(function() {
    toggleSound(localStream);
    if ($(this).data("checked")==0) {
      $(this).data("checked",1);
      $(this).css("background-image","url(../assets/images/micro_over.png)");
    } else {
      $(this).data("checked",0);
      $(this).css("background-image","url(../assets/images/micro.png)");
    }
  }) 
  $("#volumeBtn").click(function() {
    toggleSound(remoteStream);
    if ($(this).data("checked")==0) {
      $(this).data("checked",1);
      $(this).css("background-image","url(../assets/images/sound_over.png)");
    } else {
      $(this).data("checked",0);
      $(this).css("background-image","url(../assets/images/sound.png)");
    }
  })   
}

function init() {
  initUIFunction();
  if(PeerConnection) {
    rtc.createStream({
      "video": {"mandatory": {}, "optional": []},
      "audio": true
    }, function(stream) {
      document.getElementById('you').src = URL.createObjectURL(stream);
      document.getElementById('you').play();
      //videos.push(document.getElementById('you'));
      //rtc.attachStream(stream, 'you');
      //subdivideVideos();
	  localStream = stream;
	  $("#you").show("slow");
	  sendUserUpdate();
    });
  } else {
    alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
  }

  //var room = window.location.hash.slice(1);
  room = window.location.hash.slice(1);

  rtc.connect("ws:" + window.location.href.substring(window.location.protocol.length).split('#')[0], room);

  rtc.on('add remote stream', function(stream, socketId) {
    console.log("ADDING REMOTE STREAM...");
	/*
    var clone = cloneVideo('you', socketId);
    document.getElementById(clone.id).setAttribute("class", "");
    rtc.attachStream(stream, clone.id);
	*/
	var remoteVideo = document.getElementById('remoteVideo');
	remoteVideo.src = window.URL.createObjectURL(stream);
    subdivideVideos();
	remoteStream = stream;
	myuser.seconds = 0;
	clearInterval(timer);
    timer = setInterval(updateTimer,1000);
	sendUserUpdate();
  });
  rtc.on('disconnect stream', function(data) {
    console.log('remove ' + data);
    removeVideo(data);
	endChat('');
  });
  
  rtc.on('user_update', function(data) {
    console.log('RTC on use update from server: ' + data);
	user = data.user;
    if (user && user.username && myuser.username!=user.username && hisuser.username!=user.username) {
      hisuser = user;
      console.log("message from: " + user.username);
      $("#spanUser").text(hisuser.username);
      $("#remoteVideo").show("slow");
      addUser(user);
    }
  });
  
  //initFullScreen();
  //initNewRoom();
  //initChat();
}

window.onresize = function(event) {
  //subdivideVideos();
};