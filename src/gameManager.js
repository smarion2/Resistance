var sessionManager = require('./sessionManager.js');

exports.createNewGame = function (connection) {
    console.log('Creating new game');
    var sessionId = sessionManager.createNewSession(connection);
    connection.sendUTF(JSON.stringify({ messageType: 'createGame', sessionId: sessionId }));
};

exports.joinGame = function (message, connection) {
    var session = sessionManager.getSessionBySessionId(message.sessionId);
    if (session) {
        session.players.push({ name: message.name, connection: connection });
        console.log('Player joined session:' + message.sessionId + ' player count: ' + session.players.length);
        // broadcast players to everyone?
    }
};

exports.startGame = function (sessionId) {
    var session = sessionManager.getSessionBySessionId(sessionId);
    if (session) {
        assignPlayerRoles(session.players);
        var players = getPlayerNames(session.players);
        for (var player in session.players) {
            console.log('player role: ' + session.players[player].role);
            session.players[player].connection.sendUTF(JSON.stringify({ messageType: 'startGame', role: session.players[player].role, players: players }));
        }
    }
};

exports.assignMissionLeader = function(sessionId) {
    assignMissionLeader(sessionId);
};

exports.submitMissionSelection = function(message) {
    var session = sessionManager.getSessionBySessionId(message.sessionId);
    if (session) {
        for (var player in session.players) {
            session.players[player].connection.sendUTF(JSON.stringify({ messageType: 'approveMission', selectedPlayers: message.selectedPlayers }));
        }
    }
};

exports.registerVote = function(message) {
    var session = sessionManager.getSessionBySessionId(message.sessionId);
    if (session) {
        session.missionVotes++;
        console.log('total mission votes: ' + session.missionVotes); 
        console.log('total players ' + session.players.length);
        for (var player in session.players) {
            if (session.players[player].name === message.name) {
                session.players[player].approvedMission = message.approvedMission;
                break;
            }
        }        
        if (session.missionVotes === session.players.length) {
            var results = [];
            var totalSuccess = 0;
            session.missionVotes = 0;
            for (var player in session.players) {
                if (session.players[player].approvedMission) {
                    totalSuccess++;
                }
                results.push({
                    name: session.players[player].name,
                    result: session.players[player].approvedMission
                });
                session.players[player].approvedMission = message.approvedMission;
            }
            session.serverConnection.sendUTF(JSON.stringify({ messageType: 'missionVoteResults', results: results }));
            if (totalSuccess <= session.players.length) {
                assignMissionLeader(message.sessionId);
            }
        }
    }
}

function assignMissionLeader(sessionId) {
    var session = sessionManager.getSessionBySessionId(sessionId);
    if (session) {
        session.leaderToken = session.leaderToken % session.players.length;
        console.log(session.leaderToken);
        var numberOfMissionMembers = getMissionMembers(session.players.length, session.roundNumber);
        session.players[session.leaderToken].connection.sendUTF(JSON.stringify({ messageType: 'selectMission', numberToPick: numberOfMissionMembers }));
        session.leaderToken++;
    }
}

function assignPlayerRoles(players) {
    var roleChart = {
        5: [3, 2],
        6: [4, 2],
        7: [4, 3],        
        8: [5, 3],
        9: [6, 3],
        10: [6, 4]
    };
    var roles = roleChart[players.length];
    console.log('player Count ' + players.length + ' roles ' + JSON.stringify(roles));
    for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
    }
    var playerIndex = 0;
    for (var i = 0; i < roles[0]; i++) {
        players[playerIndex].role = 'blue';
        console.log('Player ' + players[playerIndex].name + ' is blue');
        playerIndex++;
    }
    for (var i = 0; i < roles[1]; i++) {
        players[playerIndex].role = 'red';
        console.log('Player ' + players[playerIndex].name + ' is red');
        playerIndex++;
    }
}

function getMissionMembers(playerCount, round) {
    var members = {
        5: [2, 3, 2, 3, 3],
        6: [2, 3, 4, 3, 4],
        7: [2, 3, 3, 4, 4],
        8: [3, 4, 4, 5, 5],
        9: [3, 4, 4, 5, 5],
        10: [3, 4, 4, 5, 5]
    };
    return members[playerCount][round];
}

function getPlayerNames(players) {
    var list = []
    for (var player in players) {
        list.push(players[player].name);
    }
    return list;
}