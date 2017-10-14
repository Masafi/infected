var socket = io.connect(window.location.href, {secure: true});
var token = undefined;
var chunksGot = 0;

socket.on('reg-error', function(errText) {
	let errDiv = document.getElementById('errorText');
	errDiv.innerHTML = errText;
	let nickDiv = document.getElementById('nicknameForm');
	nickDiv.style.display = 'inline';
});

socket.on('reg-success', function(key, id, name) {
	token = key;
	myNick = name;
	myId = id;
	activateLoading();
});

socket.on('update', function(data) {
	dataUpdated = false;
	gameData = data;
});

socket.on('reg-disconnect', function(id) {
	if(players.has(id)) {
		players.get(id).graphics.unstageFromScene(objects);
		players.get(id).nameSprite.unstageFromScene(objects);
		players.delete(id);
	}
});

socket.on('map-chunk', function(chunk) {
	map.updateChunk(chunk);
	chunksGot++;
	updateProgress();
});

function updateProgress() {
	document.getElementById('mapLoadingProgress').setAttribute('value', Math.floor(chunksGot * chunkSize * chunkSize / (mapSize.x * mapSize.y) * 100));
	if(chunksGot >= Math.floor((mapSize.x * mapSize.y) / (chunkSize * chunkSize))) {
		activateGame();
	}
}

function activateLoading() {
	document.getElementById('nicknameForm').style.display = 'none';
	document.getElementById('loadingForm').style.display = 'inline';
}

function play() {
	var nicknameInput = document.getElementsByName('nickname')[0].value;
	socket.emit('registration', nicknameInput);
}

function activateGame() {
	document.getElementById('loadingForm').style.display = 'none';
	isGameActive = 1;
	screenStage.addChild(gameScene);
	lastTickTime = new Date().getTime();
}