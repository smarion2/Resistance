var viewModel;
var ws;

if ("WebSocket" in window) {
    if (ws == null) {
        ws = new WebSocket("ws:localhost:1337", 'echo-protocol');
    }

    ws.onmessage = function (message) {
        console.log(JSON.stringify(message.data));
        var parsedMessage = JSON.parse(message.data);
        for (var i in parsedMessage) {
            console.log(i);
        }
        switch (parsedMessage.messageType) {
            case 'createGame':
                console.log(parsedMessage.sessionId);
                viewModel.sessionId(parsedMessage.sessionId);
                break;
            case 'startGame':
                console.log('starting game');
                viewModel.playersLoading(false);
                break;
            case 'updatePlayerList':
                viewModel.playerList(parsedMessage.players);
                break;
        }
    }
} else {
    alert("Websockets are not supported in this browser please use something not terrible");
}

var gameModel = function () {
    this.sessionId = ko.observable("");
    this.playersLoading = ko.observable(true);
    this.playerName = ko.observable("");
    this.playerList = ko.observableArray();

    this.createGame = function () {
        ws.send(JSON.stringify({ messageType: 'createGame' }));
    };

    this.joinGame = function () {
        ws.send(JSON.stringify({
            messageType: 'joinGame',
            sessionId: this.sessionId(),
            name: this.playerName()
        }));
    };

    this.startGame = function () {
        this.playersLoading(false);
        console.log(this.playersLoading());
        ws.send(JSON.stringify({
            messageType: 'startGame',
            sessionId: this.sessionId()
        }));
    };
};

viewModel = new gameModel();
ko.applyBindings(viewModel);
