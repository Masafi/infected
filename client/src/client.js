var port = 80;
var socket = io.connect(window.location.href.slice(0, -1) + ':' + port);
var persKey = undefined;
var myNick = undefined;
var myId = undefined;

socket.on('reg-error', function () {
	let errDiv = document.getElementById('errorText');
	errDiv.innerHTML = "Username empty!";
});

socket.on('reg-success', function (key, name, id) {
	persKey = key;
	let nickDiv = document.getElementById('nicknameForm');
	nickDiv.style.display = 'none';
	console.log("You successfully joined the game, your nickname is: " + name);
	myNick = name;
	myId = id;
	activateGame();
});

socket.on('new-player', function (name, online, id) {
	console.log(name + " joined the game. Total online: " + online);
});

socket.on('position', function (usr) {
	if(usr[1] != myId) {
		if(!users.has(usr[1])) {
			console.log(usr[0] + " isn't exists");
			let pl = new Player();
			pl.name = usr[0];
			pl.text.text = usr[0];
			users.set(usr[1], pl);
			objects.addChild(pl.sprite);
			objects.addChild(pl.text);
		}
		setPlayerCoords(users.get(usr[1]), usr[2]);
	}
});

socket.on('usr-disc', function (id) {
	if(users.has(id)) {
		objects.removeChild(users.get(id).sprite);
		objects.removeChild(users.get(id).text);
	}
	users.delete(id);
})

function play() {
	var nicknameInput = document.getElementsByName('nickname')[0].value;
	socket.emit('registration', nicknameInput);
}