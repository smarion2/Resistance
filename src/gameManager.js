var sessionManager = require('./sessionManager.js');

exports.createNewGame = function (connection) {
    console.log('Creating new game');
    var sessionId = sessionManager.createNewSession(connection);
    connection.sendUTF(JSON.stringify({ messageType: 'createGame', sessionId: sessionId }));
};

exports.joinGame = function (message, connection) {
    var session = sessionManager.getSessionBySessionId(message.sessionId);
    if (session) {
        if (session.players.length < 10) {
            var playerSession = generateId(10);
            session.players.push({ name: message.name, connection: connection, playerSession: playerSession });
            session.serverConnection.sendUTF(JSON.stringify({messageType: 'joinedGameServer', name: message.name }));
            connection.sendUTF(JSON.stringify({messageType: 'joinedGamePlayer', playerSession: playerSession }));
            console.log('Player joined session:' + message.sessionId + ' Total player count: ' + session.players.length);            
        } else {
            connection.sendUTF(JSON.stringify({messageType: 'error', error: 'Cannot join session. Session is full' }));
            console.log('Player unable to join session. Session full');            
        }
    }
};

exports.startGame = function (sessionId) {
    var session = sessionManager.getSessionBySessionId(sessionId);
    if (session && session.players.length >= 5 && session.players.length <= 10) {        
        assignPlayerRoles(session.players);
        for (var player in session.players) {
            sendPlayerListAndRoleToPlayer(sessionId, player);
        }    
        assignMissionLeader(sessionId);
        session.serverConnection.sendUTF(JSON.stringify({ messageType: 'startGameServer' }));
    }
};

exports.reconnectToGame = function (message, connection) {
    var session = sessionManager.getSessionBySessionId(message.sessionId);
    if (session) {
        for (var player in session.players) {
            if (session.players[player].playerSession === message.playerSession) {
                session.players[player].connection = connection;
                if (session.gameState !== 'preGame') {
                    sendPlayerListAndRoleToPlayer(message.sessionId, player);
                }
                switch (session.gameState) {
                    case 'missionLeaderAssigned':
                        if (session.players[player].isMissionLeader) {
                            var numberOfMissionMembers = getMissionMembers(session.players.length, session.roundNumber);                            
                            connection.sendUTF(JSON.stringify({ messageType: 'selectMission', numberToPick: numberOfMissionMembers }))
                        }
                        break;
                    case 'missionSubmitted':
                        if (typeof(session.players[player].approvedMission) === 'undefined' || session.players[player].approvedMission === null) {
                            connection.sendUTF(JSON.stringify({ messageType: 'approveMission', selectedPlayers: session.selectedPlayers }));
                        }
                        break;
                    case 'missionStarted':
                        if (session.players[player].isOnMission && !session.players[player].hasSubmitMissionResults) {
                            connection.sendUTF(JSON.stringify({ messageType: 'runMission' }));
                        }
                        break;  
                }
                break;
            }
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
            var result;
            if (totalSuccess <= (session.players.length / 2)) {
                // TO DO keep track faile vote rounds blue auto fails at 5 in a row.
                console.log('Mission did not recieve enough votes. Assigning new leader');
                result = 'Failed';
                sessionManager.resetWhoGoesOnMission(message.sessionId);
                assignMissionLeader(message.sessionId);
            } else {
                console.log('Mission passed');
                result = 'Passed';
                for (var player in session.players) {
                    if (session.players[player].isOnMission) {
                        console.log(session.players[player].name + ' is being sent on the mission');
                        session.players[player].connection.sendUTF(JSON.stringify({ messageType: 'runMission' }));
                    }
                }
            }
            session.serverConnection.sendUTF(JSON.stringify({ messageType: 'missionVoteResults', results: results, result: result }));
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

function sendPlayerListAndRoleToPlayer(sessionId, playerIndex) {
    var session = sessionManager.getSessionBySessionId(sessionId);
    if (session) {        
        var players = getPlayerNames(session.players);        
        var otherSpies = [];
        for (var player in session.players) {
            if (session.players[player].role === 'red' && player !== playerIndex) {
                otherSpies.push(session.players[player].name);
            } 
        }
        console.log('otherSpies: ' + JSON.stringify(otherSpies));        
        console.log('Roles have been assigned, time to start the game');
        var message = { 
            messageType: 'startGamePlayer',
            role: session.players[playerIndex].role,
            players: players                
        };
        if (session.players[playerIndex].role === 'red') {
            message.otherSpies = otherSpies;
        }

        console.log('MESSAGE: ' + JSON.stringify(message));
        session.players[playerIndex].connection.sendUTF(JSON.stringify(message));
    }
}


function assignMissionLeader(sessionId) {
    var session = sessionManager.getSessionBySessionId(sessionId);
    if (session) {
        session.gameState = 'missionLeaderAssigned';
        sessionManager.resetMissionLeader(sessionId);
        session.leaderToken = session.leaderToken % session.players.length;        
        var numberOfMissionMembers = getMissionMembers(session.players.length, session.roundNumber);
        var player = session.players[session.leaderToken];
        player.isMissionLeader = true;
        player.connection.sendUTF(JSON.stringify({ messageType: 'selectMission', numberToPick: numberOfMissionMembers }));
        session.serverConnection.sendUTF(JSON.stringify({messageType: 'selectMission', missionLeader: player.name }));
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
    // lazy for now
    for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
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

function generateId(length) {
    var result = '';
    var characters  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }