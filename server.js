const http = require('http'); // Require http server
const fs = require('fs'); // Require filesystem module
const path = require('path'); // Require path module for absolute file paths
const port = 3000; // Set the server port
const ip = "127.0.0.1"; // Set the server IP
let numClienti = 0; // Counter for connected clients
const users = []; // Array to store connected user IDs

// Function to handle HTTP requests
function requestAnswerer(pathUrl, filePath, response) {
    const estensione = path.extname(filePath);

    // Determine the content type based on the file extension
    const contentTypeDizionario = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
    };
    const contentType = contentTypeDizionario[estensione] || 'application/octet-stream';

    fs.readFile(filePath, function (error, data) {
        if (error) {
            console.error(`Errore nel leggere il file ${filePath}: ${error.message}`);
            response.writeHead(404, { 'Content-Type': 'text/html' });
            response.end(`<h1>404 - File Not Found</h1>`);
        } else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(data, 'utf8');
        }
    });
}

function requestHandler(request, response) {
    const urlPath = request.url;
    let numUtente0;
    if (request.method === "GET") {
        switch (urlPath) {
            case "/":
                requestAnswerer(urlPath, "public/index.html", response);
                break;
            case "/style":
                requestAnswerer(urlPath, "style/style.css", response);
                break;
            case "/creaTabella":
                requestAnswerer(urlPath, "script/tabella.js", response);
                break;

            default:
                response.writeHead(404, { 'Content-Type': 'text/html' });
                response.end(`<h1>404 - Page Not Found</h1>`);
        }
    } else {
        response.writeHead(405, { 'Content-Type': 'text/html' });
        response.end(`<h1>405 - Method Not Allowed</h1>`);
    }
}

// Create the HTTP server
const server = http.createServer(requestHandler);

// Start the server
server.listen(port, ip, function () {
    const serverUrl = `http://${ip}:${port}`;
    console.log(`Server started on ${serverUrl}`);
});

// Include the socket.io module and pass the HTTP server object
const io = require("socket.io")(server, {
    cors: {
        origin: `http://${ip}:${port}`, // Allow client connections from this origin
        methods: ["GET", "POST"],
    },
});

const playerShips = {};


// Handle WebSocket connections
io.sockets.on('connection', function (socket) {
    // Store the socket ID in the session
    socket.username = socket.id;
    users.push(socket.id); // Add the connected user to the list
    console.log('Cliente connesso: ' + socket.id);

    // Notify the client about the connection
    socket.emit('connesso', `${ip} porta: ${port}`);
    numClienti++;

    // Notify all clients about the number of connected users
    io.emit('stato', numClienti, users);
    console.log('Clienti connessi:', numClienti);

    socket.on('naviPosizionate', (matriceNavi) => {
        playerShips[socket.id] = matriceNavi;
        console.log(`Matrice ricevuta da ${socket.id}:`, matriceNavi);
    });

    // Ricevi un colpo e controlla se va a segno
    socket.on('colpo', (target) => {
        console.log("on colpo");
        const { row, col, opponentId } = target;
        console.log("ciao")
        console.log(playerShips[opponentId] && playerShips[opponentId][row][col] >= 0)
        if (playerShips[opponentId] && playerShips[opponentId][row][col] >= 0) {
            io.to(socket.id).emit('esitoColpo', { success: true, message: "Colpo a segno!" });
            console.log(`Colpo a segno da ${socket.id} su ${opponentId} in (${row}, ${col})`);
        } else {
            io.to(socket.id).emit('esitoColpo', { success: false, message: "Colpo mancato!" });
            console.log(`Colpo mancato da ${socket.id} su ${opponentId} in (${row}, ${col})`);
        }
    });

    // Handle disconnection
    socket.on('disconnect', function () {
        numClienti--;
        console.log(`Cliente disconnesso: ${socket.id}`);

        // Remove the disconnected user from the list
        const index = users.indexOf(socket.id);
        if (index !== -1) {
            users.splice(index, 1);
        }

        // Notify all clients about the updated user list
        io.emit('stato', users);
        console.log('Utenti connessi:', users);
    });
});
