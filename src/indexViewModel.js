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
                viewModel.playerList(parsedMessage.players);
                break;
            case 'selectMission':
                viewModel.isSelectingMission(true);
                break;
            case 'approveMission':
                viewModel.isApprovingMission(true);
                viewModel.selectedPlayerList(parsedMessage.selectedPlayers);
                break;
        }
    }
} else {
    alert("Websockets are not supported in this browser please use something not terrible");
}

var gameModel = function () {
    this.playersLoading = ko.observable(true);
    this.isSelectingMission = ko.observable(false);
    this.isApprovingMission = ko.observable(false);
    this.sessionId = ko.observable("");
    this.playerName = ko.observable("");
    this.playerRole = ko.observable("");
    this.playerList = ko.observableArray();
    this.selectedPlayerList = ko.observableArray();

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
        ws.send(JSON.stringify({
            messageType: 'startGame',
            sessionId: this.sessionId()
        }));
    };

    this.submitMissionSelection = function () {
        this.isSelectingMission(false);
        ws.send(JSON.stringify({
            messageType: 'missionSelection',
            selectedPlayers: this.selectedPlayerList()
        }));
    }
};

viewModel = new gameModel();
ko.applyBindings(viewModel);
