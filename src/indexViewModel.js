var viewModel;
var ws;

if ('WebSocket' in window) {
    if (ws == null) {
        var ip = window.location.hostname;
        ws = new WebSocket('ws:' + ip + ':1337', 'echo-protocol');
    }

    ws.onmessage = function (message) {
        console.log(JSON.stringify(message.data));
        var parsedMessage = JSON.parse(message.data);
        switch (parsedMessage.messageType) {
            case 'error':
                window.alert(parsedMessage.error);
                break;
            case 'createGame':
                console.log(parsedMessage.sessionId);
                viewModel.sessionId(parsedMessage.sessionId);
                break;
            case 'joinedGameServer':
                viewModel.playerList.push(parsedMessage.name);
                break;
            case 'joinedGamePlayer':
                viewModel.playerSession = parsedMessage.playerSession;
                var user = {
                    sessionId: viewModel.sessionId(),
                    name: viewModel.playerName(),                    
                    playerSession: parsedMessage.playerSession
                };
                localStorage.user = JSON.stringify(user);
                break;
            case 'startGameServer':
                viewModel.increment();
                fillGameBoard(parsedMessage.playersPerRound);
                break;
            case 'startGamePlayer':
                console.log('starting game you are ' + parsedMessage.role);
                viewModel.gameStarted(true);
                viewModel.playersLoading(false);
                viewModel.playerRole(parsedMessage.role);
                viewModel.playerList(parsedMessage.players);
                viewModel.otherSpies(parsedMessage.otherSpies);
                break;
            case 'selectMission':
                viewModel.isSelectingMission(true);
                viewModel.missionLeader(parsedMessage.missionLeader);
                viewModel.numberGoingOnMission(Number(parsedMessage.numberToPick));
                break;
            case 'approveMission':
                viewModel.isApprovingMission(true);
                viewModel.selectedPlayerList(parsedMessage.selectedPlayers);
                break;
            case 'missionVoteResults':
                viewModel.missionVotesRecieved(true);
                viewModel.missionLeader('');
                viewModel.missionVoteResults(parsedMessage.results);
                viewModel.votingResult(parsedMessage.result);
                viewModel.leaderVoteFailCount(parsedMessage.leaderVoteFailCount);
                console.log('votes recieved: ' + viewModel.missionVotesRecieved());
                break;
            case 'runMission':
                viewModel.isRunningMission(true);
                break;
            case 'missionResults':
                viewModel.missionVotesRecieved(false);                
                viewModel.totalBlueVotes(parsedMessage.blueCount);
                viewModel.totalRedVotes(parsedMessage.redCount);
                recordWinner(parsedMessage.blueWins);
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
                viewModel.sessionId(user.sessionId);                
                viewModel.screen(2);
                console.log(JSON.stringify(user));
                ws.send(JSON.stringify({ messageType: 'reconnect', userInfo: user }));
            }            
        }
    }, 100);

    ws.onclose = function () {
        // reconnect here if server dies
    }
} else {
    alert('Websockets are not supported in this browser please use something not terrible');
}

var gameModel = function () {
    this.sessionId = ko.observable('');
    this.playerSession = '';
    this.roundNumber = 0;
    this.playersLoading = ko.observable(true);
    this.isServer = ko.observable(false);
    this.isSelectingMission = ko.observable(false);
    this.numberGoingOnMission = ko.observable();
    this.isApprovingMission = ko.observable(false);
    this.missionVotesRecieved = ko.observable(false);
    this.isRunningMission = ko.observable(false);
    this.playerName = ko.observable('');
    this.playerRole = ko.observable('');
    this.playerList = ko.observableArray();
    this.missionLeader = ko.observable('');
    this.leaderVoteFailCount = ko.observable();
    this.otherSpies = ko.observableArray();
    this.selectedPlayerList = ko.observableArray([]);
    this.missionVoteResults = ko.observableArray([]);
    this.votingResult = ko.observable();
    this.screen = ko.observable(0);
    this.gameStarted = ko.observable(false);
    this.gameScore = ko.observableArray([]);
    this.totalBlueVotes = ko.observable(0);
    this.totalRedVotes = ko.observable(0);

    this.increment = function() {
        this.screen(this.screen() + 1);
    };

    this.hasSelectedCorrectNumberOfMembers = ko.pureComputed(function () {
        return this.selectedPlayerList().length === Number(this.numberGoingOnMission());
    }, this);

    this.roleCard = ko.pureComputed(function () {
        var faceCss = 'face back';
        return this.playerRole() === 'blue' ? faceCss + ' resistance' : faceCss + ' spy';
    }, this);

    this.createGame = function () {
        this.isServer(true);
        ws.send(JSON.stringify({ messageType: 'createGame' }));
        this.increment();
    };

    this.joinGame = function () {
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
    viewModel.screen(0);
    viewModel.gameStarted(false);
    viewModel.otherSpies();
    viewModel.playersLoading(true);
    viewModel.isSelectingMission(false);
    viewModel.numberGoingOnMission(0);
    viewModel.isApprovingMission(false);
    viewModel.missionVotesRecieved(false);
    viewModel.isRunningMission(false);
    viewModel.leaderVoteFailCount(0);
}

function fillGameBoard(playersPerRound) {
    for (var i = 0; i < playersPerRound.length; i++) {
        document.getElementById("round-" + i).innerHTML = playersPerRound[i];
    }
}

function recordWinner(blueWon) {
    if (blueWon) {
        document.getElementById('round-' + viewModel.roundNumber).style.background = "#0258e2";
    } else {
        document.getElementById('round-' + viewModel.roundNumber).style.background = '#c11f1f';
    }
    viewModel.roundNumber++;
}