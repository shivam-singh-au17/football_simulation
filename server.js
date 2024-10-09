//------------------------
//    NPM Modules
//------------------------
const fs = require("fs").promises;  // Use fs promises API for async file operations
const express = require("express"); // Import express for handling web server and routes
const bodyParser = require("body-parser"); // Parse incoming request bodies
const cookieParser = require("cookie-parser"); // Parse cookies
const async = require("async"); // Utility for async control flow
const http = require("http"); // Create HTTP server
const footballEngine = require("footballsimulationengine"); // Custom football simulation engine

let matchInfo; // Store match information globally
let its; // Counter for game iterations

const maxTeamAGoals = 5; // Desired goals for Team A (kickOffTeam)
const maxTeamBGoals = 6; // Desired goals for Team B (secondTeam)

//---create a new express server-------
const app = express(); // Initialize express app

// Use middleware for parsing cookies, URL-encoded data, and JSON data
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//------------------------
//    Express Endpoints
//------------------------

// Redirect root URL to the match page
app.all("/", (req, res) => {
	return res.redirect('/match.html');
});

// API to get starting positions of players on the pitch
app.get("/getstartPOS", async (req, res) => {
	try {
		// Read pitch size and both teams' data from files
		const pitchSize = await readFile("teams/Pitch.json");
		const team1 = await readFile("teams/Kerala.json");
		const team2 = await readFile("teams/Bengaluru.json");

		// Initialize the match setup using the football engine
		matchInfo = await footballEngine.initiateGame(team1, team2, pitchSize);

		// console.log(matchInfo); // Log match setup for debugging

		// Process the starting positions of players and send to client
		const sendArray = await processPositions(matchInfo.kickOffTeam, matchInfo.secondTeam, matchInfo);
		res.send(sendArray); // Send processed positions
	} catch (error) {
		console.error("Error: ", error); // Log any error encountered
		res.status(500).send("Error processing request"); // Respond with an error status
	}
});

// API to start the second half of the match
app.get("/startSecondHalf", async (req, res) => {
	try {
		// Start the second half of the match using the engine
		matchInfo = await footballEngine.startSecondHalf(matchInfo);

		// Process player positions and send to client
		const sendArray = await processPositions(matchInfo.kickOffTeam, matchInfo.secondTeam, matchInfo);
		res.send(sendArray);
	} catch (error) {
		console.error("Error: ", error);
		res.status(500).send("Error processing request");
	}
});

// API to simulate player movements and update match info
app.get("/movePlayers", async (req, res) => {
	try {
		its++; // Increment the iteration counter

		// Simulate a single iteration (or "move") of the match
		matchInfo = await footballEngine.playIteration(matchInfo);

		// Limit Team A and Team B goals to predefined maximums
		if (matchInfo.kickOffTeamStatistics.goals > maxTeamAGoals) {
			matchInfo.kickOffTeamStatistics.goals = maxTeamAGoals;
		}

		if (matchInfo.secondTeamStatistics.goals > maxTeamBGoals) {
			matchInfo.secondTeamStatistics.goals = maxTeamBGoals;
		}

		// Process player positions and send to client
		const sendArray = await processPositions(matchInfo.kickOffTeam, matchInfo.secondTeam, matchInfo);
		res.send(sendArray);
	} catch (error) {
		console.error("Error: ", error);
		res.status(500).send("Error processing request");
	}
});

// API to get match details (for debugging or live status)
app.get("/getMatchDetails", (req, res) => {
	// console.log(matchInfo); // Log match info to server console
	res.send(matchInfo); // Send match info to client
});

//------------------------
//   Functions
//------------------------

// Function to read a file and return parsed JSON data
async function readFile(filePath) {
	try {
		const data = await fs.readFile(filePath, 'utf8'); // Read file content as string
		return JSON.parse(data); // Parse the JSON string and return the object
	} catch (error) {
		throw error; // If there's an error, throw it for the calling function to handle
	}
}

// Function to process the positions of players from both teams
async function processPositions(A, B, C) {
	const sendArray = []; // Array to hold all position data

	// Add pitch size to sendArray
	sendArray.push(C.pitchSize[0], C.pitchSize[1]);

	// Add all players' positions from Team A to the sendArray
	await async.eachSeries(A.players, (thisPlayerA, callback) => {
		sendArray.push(thisPlayerA.startPOS[0], thisPlayerA.startPOS[1]); // Add each player's X, Y coordinates
		callback(); // Proceed to the next player
	});

	// Add all players' positions from Team B to the sendArray
	await async.eachSeries(B.players, (thisPlayerB, callback) => {
		sendArray.push(thisPlayerB.startPOS[0], thisPlayerB.startPOS[1]); // Add each player's X, Y coordinates
		callback(); // Proceed to the next player
	});

	// Add ball position and complete match info to the array
	sendArray.push(C.ball.position[0], C.ball.position[1], C);

	return sendArray; // Return the complete array with positions
}

//------------------------
//    Express HTTP
//------------------------

// Serve static files from the "public" directory
app.use(express.static("public"));

// Create an HTTP listener on port 1442
http.createServer(app).listen(1442);
console.log("Server starting on IP using port 1442 for HTTP");
