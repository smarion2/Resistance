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
        console.log('Player joined session:' + message.sessionId + ' Total player count: ' + session.players.length);
        // broadcast players to everyone?
    }
};

exports.startGame = function (sessionId) {
    var session = sessionManager.getSessionBySessionId(sessionId);
    if (session) {
        assignPlayerRoles(session.players);
        var players = getPlayerNames(session.players);
        for (var player in session.players) {
            console.log('Roles have been assigned, time to start the game');            
            session.players[player].connection.sendUTF(JSON.stringify({ messageType: 'startGame', role: session.players[player].role, players: players }));
        }
    }
};

exports.reconnectToGame = function (message, connection) {
    var session = sessionManager.getSessionBySessionId(message.sessionId);
    if (session) {
        for (var player in session.players) {
            if (session.players[player].name === message.name) {
                session.players[player].connection = connection;
                switch (session.gameState) {
                    case 'missionLeaderAssigned':
                        if (session.players[player].isMissionLeader) {
                            var numberOfMissionMembers = getMissionMembers(session.players.length, session.roundNumber);                            
                            connection.sendUTF(JSON.stringify({ messageType: 'selectMission', numberToPick: numberOfMissionMembers }))
                        }
                        break;
                    case 'missionSubmitted':
                        if (session.players[player].approvedMission === null) {
                            connection.sendUTF(JSON.stringify({ messageType: 'approveMission', selectedPlayers: session.selectedPlayers }));
                        }
                        break;
                    case 'missionStarted':
                        if (session.players[player].isOnMission && !session.players[player].hasSubmitMissionResults) {
                            connection.sendUTF(JSON.stringify({ messageType: 'runMission' }));
                        }
                        break;  
                }
            }
            break;
        }
    } else {
        connection.sendUTF(JSON.stringify({ messageType: 'gameOver' }));
    }
}

exports.assignMissionLeader = function (sessionId) {
    assignMissionLeader(sessionId);
};

exports.submitMissionSelection = function (message) {
    var session = sessionManager.getSessionBySessionId(message.sessionId);
    if (session) {
        console.log('Misison has been selected, sending out to players for approval');
        session.gameState = 'missionSubmitted';
        session.selectedPlayers = message.selectedPlayers;
        console.log(JSON.stringify(message.selectedPlayers));
        for (var player in session.players) {
            for (var i = 0; i < message.selectedPlayers.length; i++) {
                if (message.selectedPlayers[i] === session.players[player].name) {
                    console.log(session.players[player].name + ' has been registered to go on a mission');
                    session.players[player].isOnMission = true;
                    break;
                }
            }
            session.players[player].connection.sendUTF(JSON.stringify({ messageType: 'approveMission', selectedPlayers: message.selectedPlayers }));
        }
    }
};

exports.registerVote = function (message) {
    var session = sessionManager.getSessionBySessionId(message.sessionId);
    if (session) {
        session.missionVotes++;
        console.log('Vote has been submitted. Total mission votes recived so far ' + session.missionVotes);
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
            session.gameState = 'missionStarted';
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
            if (totalSuccess <= (session.players.length / 2)) {
                // TO DO keep track faile vote rounds blue auto fails at 5 in a row.
                console.log('Mission did not recieve enough votes. Assigning new leader');
                sessionManager.resetWhoGoesOnMission(message.sessionId);
                assignMissionLeader(message.sessionId);
            } else {
                console.log('Mission passed');
                for (var player in session.players) {
                    if (session.players[player].isOnMission) {
                        console.log(session.players[player].name + ' is being sent on the mission');
                        session.players[player].connection.sendUTF(JSON.stringify({ messageType: 'runMission' }));
                    }
                }
                sessionManager.resetWhoGoesOnMission(message.sessionId);
            }
        }
    }
}

exports.registerResult = function (message) {
    var session = sessionManager.getSessionBySessionId(message.sessionId);
    if (session) {
        for (var player in session.players) {
            if (session.players[player].name === message.name) {
                session.players[player].hasSubmitMissionResults = true;
            }
        }
        session.missionResults++;
        message.passedMission ? session.missionPasses++ : session.missionFails++;
        console.log('Total mission results: ' + session.missionResults);
        if (session.missionResults === getMissionMembers(session.players.length, session.roundNumber)) {
            session.roundNumber++;
            var blueWins = false;
            if (session.players.length >= 9) {
                if (session.missionFails < 2) {
                    blueWins = true;
                    session.blueWins += 1;
                } else {
                    session.redWins += 1;
                }
            } else {
                if (session.missionFails === 0) {
                    blueWins = true;
                    session.blueWins += 1;
                } else {
                    session.redWins += 1;
                }
            }
            session.serverConnection.sendUTF(JSON.stringify({ messageType: 'missionResults', blueWins: blueWins, blueCount: session.missionPasses, redCount: session.missionFails }));
            if (session.blueWins === 3 || session.redWins === 3) {
                session.serverConnection.sendUTF(JSON.stringify({ messageType: 'winner', blueWins: (session.blueWins === 3) }));
            } else {
                sessionManager.resetWhoGoesOnMission(message.sessionId);
                sessionManager.resetMissionSelectionVotes(message.sessionId);
                sessionManager.resetSubmittedMissionResult(message.sessionId);
                sessionManager.resetSelectedPlayers(message.sessionId);
                assignMissionLeader(message.sessionId);
            }
            session.missionResults = 0;
            session.missionPasses = 0;
            session.missionFails = 0;
        }
    }
};


function assignMissionLeader(sessionId) {
    var session = sessionManager.getSessionBySessionId(sessionId);
    if (session) {
        session.gameState = 'missionLeaderAssigned';
        sessionManager.resetMissionLeader(sessionId);
        session.leaderToken = session.leaderToken % session.players.length;
        console.log('Leader token is at position ' + session.leaderToken);
        var numberOfMissionMembers = getMissionMembers(session.players.length, session.roundNumber);
        var player = session.players[session.leaderToken];
        player.isMissionLeader = true;
        player.connection.sendUTF(JSON.stringify({ messageType: 'selectMission', numberToPick: numberOfMissionMembers }));
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