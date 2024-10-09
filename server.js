//------------------------
//    NPM Modules
//------------------------
const fs = require("fs").promises;
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const async = require("async");
const http = require("http");
const footballEngine = require("footballsimulationengine");

let matchInfo;
let its;

const maxTeamAGoals = 2; // Desired goals for Team A (kickOffTeam)
const maxTeamBGoals = 1; // Desired goals for Team B (secondTeam)

//---create a new express server-------
const app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//------------------------
//    Express Endpoints
//------------------------
app.all("/", (req, res) => {
	return res.redirect('/match.html');
});

app.get("/getstartPOS", async (req, res) => {
	try {
		const pitchSize = await readFile("teams/pitch.json");
		const team1 = await readFile("teams/Slugs.json");
		const team2 = await readFile("teams/Dragons.json");
		matchInfo = await footballEngine.initiateGame(team1, team2, pitchSize);
		console.log(matchInfo);
		const sendArray = await processPositions(matchInfo.kickOffTeam, matchInfo.secondTeam, matchInfo);
		res.send(sendArray);
	} catch (error) {
		console.error("Error: ", error);
		res.status(500).send("Error processing request");
	}
});

app.get("/startSecondHalf", async (req, res) => {
	try {
		matchInfo = await footballEngine.startSecondHalf(matchInfo);
		const sendArray = await processPositions(matchInfo.kickOffTeam, matchInfo.secondTeam, matchInfo);
		res.send(sendArray);
	} catch (error) {
		console.error("Error: ", error);
		res.status(500).send("Error processing request");
	}
});

app.get("/movePlayers", async (req, res) => {
	try {
		its++;
		matchInfo = await footballEngine.playIteration(matchInfo);

		// Control the goals for Team A (kickOffTeam)
		if (matchInfo.kickOffTeamStatistics.goals > maxTeamAGoals) {
			matchInfo.kickOffTeamStatistics.goals = maxTeamAGoals;
		}

		// Control the goals for Team B (secondTeam)
		if (matchInfo.secondTeamStatistics.goals > maxTeamBGoals) {
			matchInfo.secondTeamStatistics.goals = maxTeamBGoals;
		}

		const sendArray = await processPositions(matchInfo.kickOffTeam, matchInfo.secondTeam, matchInfo);
		res.send(sendArray);
	} catch (error) {
		console.error("Error: ", error);
		res.status(500).send("Error processing request");
	}
});

app.get("/getMatchDetails", (req, res) => {
	console.log(matchInfo);
	res.send(matchInfo);
});

//------------------------
//   Functions
//------------------------
async function readFile(filePath) {
	try {
		const data = await fs.readFile(filePath, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		throw error;
	}
}

async function processPositions(A, B, C) {
	const sendArray = [];
	sendArray.push(C.pitchSize[0], C.pitchSize[1]);

	await async.eachSeries(A.players, (thisPlayerA, callback) => {
		sendArray.push(thisPlayerA.startPOS[0], thisPlayerA.startPOS[1]);
		callback();
	});

	await async.eachSeries(B.players, (thisPlayerB, callback) => {
		sendArray.push(thisPlayerB.startPOS[0], thisPlayerB.startPOS[1]);
		callback();
	});

	sendArray.push(C.ball.position[0], C.ball.position[1], C);
	return sendArray;
}

//------------------------
//    Express HTTP
//------------------------

// Serve the files out of ./public as our main files
app.use(express.static("public"));

// Create an HTTP listener
http.createServer(app).listen(1442);
console.log("Server starting on IP using port 1442 for HTTP");
