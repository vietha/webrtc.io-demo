'use strict';
var sendChannel;

/////////////////////////////////////////////
String.prototype.replaceAll = function(target, replacement) {
  return this.split(target).join(replacement);
};

// template engine
String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
    ;
  });
};
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




var isChannelReady;
var isInitiator = false;
var isStarted = false;
var localStream;
var remoteStream;
var pc;
var turnReady;
var audio = new Audio('assets/soundsdink.mp3');

var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
var pc_config = {'iceServers': [{'url': '62.210.236.12:3478'}]};

var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}, {'RtpDataChannels': true}]};

var localVideo = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');

var constraints = {video: true, audio : true};
var timer;
var socket = io.connect();
var sdpConstraints = {'mandatory': {
  'OfferToReceiveAudio':true,
  'OfferToReceiveVideo':true }
};


getUserMedia(constraints, handleUserMedia, handleUserMediaError);
if (myuser.room !== '') {
  console.log('connect', myuser.room);
  socket.emit('connect', myuser);
}




function init() {
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

function toggleSound(stream) { // stream is your local WebRTC stream
  var audioTracks = stream.getAudioTracks();
  for (var i = 0, l = audioTracks.length; i < l; i++) {
    audioTracks[i].enabled = !audioTracks[i].enabled;
  }
}

// Set up audio and video regardless of what devices are present.

socket.on('requestChat', function (user){
  startCall();
});


socket.on('created', function (user){
  console.log('Created room ' + user.room);
  isInitiator = true;
});

socket.on('full', function (user){
  console.log('Room ' + user.room + ' is full');
});




socket.on('join', function (user){
  console.log('Another peer made a request to join room ' + user.room);
  console.log(user.username +" join");
  isChannelReady = true;

});

socket.on('joined', function (user){
  console.log('This peer has joined room ' + user.room);
  isChannelReady = true;  
});

socket.on('log', function (array){
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message){
	console.log('Client sending message: ', message);
  socket.emit('message', message, myuser);
}

socket.on('message', function (message, user){
  //console.log(message);
  if (user && user.username && myuser.username!=user.username && hisuser.username!=user.username) {
    hisuser = user;
    console.log("message  from:"+user.username);
    $("#spanUser").text(hisuser.username);
    $("#remoteVideo").show("slow");
    addUser(user);
  }

  
  if (message === 'got user media') {
  	//startCall();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      startCall();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye') {
    endChat(user);
  }
});
function endChat(user) {
  if (isStarted) {
    isStarted = false;
    pc.close();
    pc = null;    
  }  
  hisuser = {};
  console.log('connection closed');
  $("#remoteVideo").hide("slow");
  $("#spanUser").text("");
  $("#spanTimer").text("");
  removeUser(user);
}

function removeUser(user) {
  $("#item_"+user.username).remove();
  delete users[user.username]; 
  clearInterval(timer)

}
function addUser(user) {
  
  users[user.username] = user;
  //alert("addUser");
  if (myuser.mode!="A") {
	  socket.emit('requestChat', myuser);
  }
}

////////////////////////////////////////////////////



function handleUserMedia(stream) {
  console.log('Adding local stream.');
  localVideo.src = window.URL.createObjectURL(stream);
  localStream = stream;
  sendMessage('got user media');
  $("#localVideo").show("slow");
  if (isInitiator) {
    //startCall();
  }
}

function handleUserMediaError(error){
  console.log('getUserMedia error: ', error);
}


function updateTimer() {
	myuser.seconds++;
	$("#spanTimer").text("Time:"+formatSeconds(myuser.seconds));
}


function startCall() {
  myuser.seconds = 0;
  if (!isStarted && typeof localStream != 'undefined' && isChannelReady) {
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
    }
    clearInterval(timer);
    timer = setInterval(updateTimer,1000);
  }
}
function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message' , sessionDescription);
  sendMessage(sessionDescription);
}
function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer(setLocalAndSendMessage, logError, sdpConstraints);
  //pc.createAnswer(setLocalAndSendMessage);
}

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null, pc_constraints);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
      return;
  }
  

}

function handleIceCandidate(event) {
  console.log('handleIceCandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate});
  } else {
    console.log('End of candidates.');
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteVideo.src = window.URL.createObjectURL(event.stream);
  remoteStream = event.stream;

}

function handleCreateOfferError(event){
  console.log('createOffer() error: ', e);
}



function logError(error) {
    console.log(error.name + ": " + error.message);
}


function requestTurn(turn_url) {
  var turnExists = false;
  for (var i in pc_config.iceServers) {
    if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turn_url);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
      	console.log('Got TURN server: ', turnServer);
        pc_config.iceServers.push({
          'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turn_url, true);
    xhr.send();
  }
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}




///////////////////////////////////////////

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        mLineIndex = i;
        break;
      }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}
