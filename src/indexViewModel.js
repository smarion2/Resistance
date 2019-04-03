var viewModel;
var ws;

if ('WebSocket' in window) {
    if (ws == null) {
        ws = new WebSocket('ws:localhost:1337', 'echo-protocol');
    }

    ws.onmessage = function (message) {
        console.log(JSON.stringify(message.data));
        var parsedMessage = JSON.parse(message.data);
        for (var i in parsedMessage) {
            console.log(i);
        }
        switch (parsedMessage.messageType) {
            case 'reconnect':
                viewModel.playersLoading(false);
                break;
            case 'createGame':
                console.log(parsedMessage.sessionId);
                viewModel.sessionId(parsedMessage.sessionId);
                break;
            case 'startGame':
                console.log('starting game you are ' + parsedMessage.role);
                viewModel.gameStarted(true);
                viewModel.playersLoading(false);
                viewModel.playerRole(parsedMessage.role);
                viewModel.playerList(parsedMessage.players);
                viewModel.otherSpies(parsedMessage.otherSpies);
                break;
            case 'selectMission':
                viewModel.isSelectingMission(true);
                viewModel.numberGoingOnMission(Number(parsedMessage.numberToPick));
                break;
            case 'approveMission':
                viewModel.isApprovingMission(true);
                viewModel.selectedPlayerList(parsedMessage.selectedPlayers);
                break;
            case 'missionVoteResults':
                viewModel.missionVotesRecieved(true);
                viewModel.missionVoteResults(parsedMessage.results);
                break;
            case 'runMission':
                viewModel.isRunningMission(true);
                break;
            case 'missionResults':
                console.log('does blue win? ' + parsedMessage.blueWins);
                console.log('total pass cards ' + parsedMessage.blueCount);
                console.log('total fail cards ' + parsedMessage.redCount);
                break;
            case 'winner':
                console.log('we have a winner was blue successful? ' + parsedMessage.blueWins);                
                break;
            case 'gameOver':
                gameOver();
                break;
        }
    }
    
    window.setTimeout(function () {
        var storage = localStorage.user
        if (storage) {
            var user = JSON.parse(localStorage.user);
            if (user) {
                viewModel.playersLoading(false);
                viewModel.playerName(user.name);
                viewModel.playerRole(user.playerRole);
                console.log(JSON.stringify(user));
                ws.send(JSON.stringify({ messageType: 'reconnect', userInfo: user }));
            }
        }
    }, 1000);

    ws.onclose = function () {
        // reconnect here if server dies
    }
} else {
    alert('Websockets are not supported in this browser please use something not terrible');
}

var gameModel = function () {
    this.playersLoading = ko.observable(true);
    this.isSelectingMission = ko.observable(false);
    this.numberGoingOnMission = ko.observable();
    this.isApprovingMission = ko.observable(false);
    this.missionVotesRecieved = ko.observable(false);
    this.isRunningMission = ko.observable(false);
    this.sessionId = ko.observable('');
    this.playerName = ko.observable('');
    this.playerRole = ko.observable('');
    this.playerList = ko.observableArray();
    this.otherSpies = ko.observableArray();
    this.selectedPlayerList = ko.observableArray([]);
    this.missionVoteResults = ko.observableArray([]);
    this.screen = ko.observable(0);
    this.gameStarted = ko.observable(false);

    this.increment = function() {
        this.screen(this.screen() + 1);
    };

    this.hasSelectedCorrectNumberOfMembers = ko.pureComputed(function () {
        return (this.selectedPlayerList().length === Number(this.numberGoingOnMission()));
    }, this);

    this.createGame = function () {
        ws.send(JSON.stringify({ messageType: 'createGame' }));
    };

    this.joinGame = function () {
        var user = {
            sessionId: this.sessionId(),
            name: this.playerName(),
            role: this.playerRole()
        };
        localStorage.user = JSON.stringify(user);

        ws.send(JSON.stringify({
            messageType: 'joinGame',
            sessionId: this.sessionId(),
            name: this.playerName()
        }));
        this.increment();
    };

    this.startGame = function () {
        this.playersLoading(false);
        ws.send(JSON.stringify({
            messageType: 'startGame',
            sessionId: this.sessionId()
        }));
        this.gameStarted(true);
    };

    this.submitMissionSelection = function () {
        this.isSelectingMission(false);
        ws.send(JSON.stringify({
            messageType: 'missionSelection',
            sessionId: this.sessionId(),
            selectedPlayers: this.selectedPlayerList()
        }));
    };

    this.approveMission = function () {
        this.isApprovingMission(false);
        ws.send(JSON.stringify({
            messageType: 'missionVote',
            name: this.playerName(),
            sessionId: this.sessionId(),
            approvedMission: true
        }));
    };

    this.rejectMission = function () {
        this.isApprovingMission(false);
        ws.send(JSON.stringify({
            messageType: 'missionVote',
            name: this.playerName(),
            sessionId: this.sessionId(),
            approvedMission: false
        }));
    };

    this.passMission = function () {
        this.isRunningMission(false);
        ws.send(JSON.stringify({
            messageType: 'missionResult',
            name: this.playerName(),
            sessionId: this.sessionId(),
            passedMission: true
        }));
    };

    this.failMission = function () {
        this.isRunningMission(false);
        ws.send(JSON.stringify({
            messageType: 'missionResult',
            name: this.playerName(),
            sessionId: this.sessionId(),
            passedMission: false
        }));
    };
};

viewModel = new gameModel();
ko.applyBindings(viewModel);

function gameOver () {
    localStorage.removeItem('user');
    viewModel.playersLoading = ko.observable(true);
    viewModel.isSelectingMission = ko.observable(false);
    viewModel.numberGoingOnMission = ko.observable();
    viewModel.isApprovingMission = ko.observable(false);
    viewModel.missionVotesRecieved = ko.observable(false);
    viewModel.isRunningMission = ko.observable(false);
}