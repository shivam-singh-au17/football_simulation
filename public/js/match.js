// User Settings
const gameLength = 180000; // Total duration of the game in milliseconds
let speed = 10; // Speed of game updates
let matchInfo; // Stores information about the current match
let its = 0; // Tracks the number of iterations (time intervals in the match)
let logs = ""; // Stores the game logs for display
let loggingON = false; // Flag to toggle logging display
let isPaused = false; // Flag to track if the game is paused

function startMatch() {
	setPositions(); // Initialize player positions when the match starts
}

function setPositions() {
	// Fetch initial positions from the server
	fetchData("/getstartPOS", result => {
		const canvas = document.getElementById("map"); // Get the canvas element for the game field
		const ctx = canvas.getContext("2d"); // Get the drawing context of the canvas

		ctx.canvas.width = result[0]; // Set canvas width from the server response
		ctx.canvas.height = result[1]; // Set canvas height from the server response

		drawPlayers(ctx, result); // Draw the players based on the positions in the result

		matchInfo = result[result.length - 1]; // Extract the match info from the last item in the result array
		updateResultDisplay(matchInfo); // Update the result display with the current match status
	});
}

function pauseGame() {
	isPaused = true; // Set the game to paused
}

function playGame() {
	isPaused = false; // Resume the game
	getMatch(); // Start fetching and updating match data
}

function getMatch() {
	// Interval to continuously update the game state
	const interval = setInterval(() => {
		if (isPaused) { // Check if the game is paused
			clearInterval(interval); // Stop the interval if paused
		} else if (its === gameLength / 2) { // Check if it's halftime
			clearInterval(interval); // Stop the interval for halftime
			switchSides(); // Switch sides for the teams
			console.log("Switched sides");
		} else if (its > gameLength) { // End the game if the game length is exceeded
			clearInterval(interval); // Stop the interval after the game ends
		} else {
			movePlayers("/movePlayers"); // Move players and update game state
		}
	}, speed); // Run the loop at the specified speed
}

function movePlayers(endpoint) {
	// Fetch the updated player positions from the server
	fetchData(endpoint, result => {
		its++; // Increment iteration counter
		const canvas = document.getElementById("map"); // Get the canvas element
		const ctx = canvas.getContext("2d"); // Get the canvas drawing context

		ctx.canvas.width = result[0]; // Update canvas width
		ctx.canvas.height = result[1]; // Update canvas height

		drawPlayers(ctx, result); // Draw the updated player positions

		matchInfo = result[result.length - 1]; // Extract match info
		logs += `Iteration ${its}: ${matchInfo.iterationLog}<br>`; // Append log for this iteration

		if (loggingON) { // If logging is enabled, update the log display
			updateLoggingDisplay(logs);
		}

		updateResultDisplay(matchInfo, its); // Update the result display with current game status
	});
}

function switchSides() {
	its++; // Increment iteration counter for switching sides
	// Fetch the new positions after switching sides
	fetchData("/startSecondHalf", result => {
		const canvas = document.getElementById("map"); // Get the canvas element
		const ctx = canvas.getContext("2d"); // Get the canvas drawing context

		ctx.canvas.width = result[0]; // Update canvas width
		ctx.canvas.height = result[1]; // Update canvas height

		drawPlayers(ctx, result); // Draw players in new positions

		matchInfo = result[result.length - 1]; // Update match info after the switch
		updateResultDisplay(matchInfo); // Update the result display
	});
}

function showLogs() {
	const logElement = document.getElementById("logging"); // Get the logging element
	loggingON = logElement.style.display === "none"; // Toggle logging display
	logElement.style.display = loggingON ? "block" : "none"; // Show or hide the logging display
}

function getMatchDetails() {
	// Fetch match details from the server (if needed)
	fetchData("/getMatchDetails");
}

// Helper Functions
function fetchData(endpoint, callback) {
	const http = new XMLHttpRequest(); // Create a new XMLHttpRequest object
	http.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			callback && callback(JSON.parse(this.responseText)); // Execute the callback with the parsed response if successful
		}
	};
	http.open("GET", endpoint, true); // Initialize a GET request to the provided endpoint
	http.send(); // Send the request
}

function drawPlayers(ctx, result) {
	// Loop through the player positions in the result array and draw them
	for (let i = 2; i < result.length - 1; i++) {
		ctx.beginPath(); // Start a new drawing path
		ctx.arc(result[i], result[i + 1], 10, 0, 2 * Math.PI); // Draw a circle (player) with radius 10

		// Set the player color based on their position in the array
		ctx.fillStyle = i < 24 ? "red" : i > 12 && i < result.length - 3 ? "blue" : "lime";
		ctx.fill(); // Fill the circle with the chosen color
		i++; // Skip the next index as it represents y-coordinates
	}
	// Draw a small marker at the last position
	ctx.moveTo(result[result.length - 3], result[result.length - 2]);
	ctx.lineTo(result[result.length - 3] + 1, result[result.length - 2] + 1);
	ctx.stroke(); // Stroke the line
}

function updateResultDisplay(matchInfo, iteration = "") {
	// Update the result display with the current match score and iteration number
	document.getElementById("result").innerHTML =
		`${matchInfo.kickOffTeam.name}: ${matchInfo.kickOffTeamStatistics.goals} - ` +
		`${matchInfo.secondTeamStatistics.goals} : ${matchInfo.secondTeam.name} Moves(${iteration})`;
}

function updateLoggingDisplay(logs) {
	const logElement = document.getElementById("logging"); // Get the logging element
	logElement.innerHTML = logs; // Update the inner HTML with the logs
	logElement.scrollTop = logElement.scrollHeight; // Auto-scroll to the bottom of the log
}
