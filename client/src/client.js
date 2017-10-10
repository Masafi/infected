var socket = io.connect(window.location.href, {secure: true});
var token = undefined;

socket.on('reg-error', function(errText) {
	let errDiv = document.getElementById('errorText');
	errDiv.innerHTML = errText;
	let nickDiv = document.getElementById('nicknameForm');
	nickDiv.style.display = 'inline';
});

socket.on('reg-success', function(key, id, name) {
	token = key;
	let nickDiv = document.getElementById('nicknameForm');
	nickDiv.style.display = 'none';
	myNick = name;
	myId = id;
	activateGame();
});

socket.on('update', function (data) {
	gameData = data;
});

socket.on('reg-disconnect', function(id) {
	if(players.has(id)) {
		players.get(id).graphics.unstageFromScene(objects);
		players.get(id).nameSprite.unstageFromScene(objects);
		players.delete(id);
	}
});

function play() {
	var nicknameInput = document.getElementsByName('nickname')[0].value;
	socket.emit('registration', nicknameInput);
}

function activateGame() {
	isGameActive = 1;
	stage.addChild(objects);
}