/**
 * TODO:
- bottone per effettuare rivincita  (azzera e abilita di nuovo i click sulle caselle)
- turni
- magari permettere a solo i primi due socket collegati di giocare
- magari mettere il contatore di pezzi nemici in una piccola legenda sulla destra piuttosto che nell'alert
- personalmente rimuoverei gli l'alert (tranne per vittoria e sconfitta) e metterei una stringa vicina alla tabella che ci notifica dell'esito del colpo
 */
const http = require('http'); // Require http server
const fs = require('fs'); // Require filesystem module
const path = require('path'); // Require path module for absolute file paths
const { url } = require('inspector');
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
            case "/bloccaRicarica":
                requestAnswerer(urlPath, "script/bloccaRicarica.js", response)
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

const playerShips = {}; // Oggetto per salvare le navi di ciascun giocatore

// CREA STANZE!
io.sockets.on('connection', function (socket) {
    if(users.length == 2){
        socket.emit('disconnettiti', '<h1> Ci dispiace, non c\'è posto per te ora, riprova più tardi</h1>'); 
        //client si disconnette e apre una nuova pagina html con scritto messaggio di disconnessione
    }
    
    if(users.length == 1){ 
        // è un modo un po storto per evitare che il primo client possa mandare colpi quando il secondo non si è ancora connesso
        socket.emit('yourTurn', true);
    }
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

    // Ricezione della matrice delle navi
    socket.on('naviPosizionate', (matriceNavi) => {
        // Validare che la matrice sia un array 10x10
        if (
            Array.isArray(matriceNavi) &&
            matriceNavi.length === 10 &&
            matriceNavi.every(row => Array.isArray(row) && row.length === 10)
        ) {
            playerShips[socket.id] = matriceNavi; // Salva la matrice
            console.log(`Matrice ricevuta correttamente da ${socket.id}:`);
        } else {
            console.error(`Errore: matrice non valida ricevuta da ${socket.id}:`, matriceNavi);
            socket.emit('errore', { message: 'La matrice inviata non è valida.' });
        }
    });

    // Ricevi un colpo e controlla se va a segno
    socket.on('colpo', (r, c, opponent) => {
        console.log("on colpo");
        const row = r;
        const col = c;
        const opponentId = opponent;

        // Verifica che la matrice dell'avversario esista e sia valida
        if (playerShips[opponentId] && playerShips[opponentId][row] && typeof playerShips[opponentId][row][col] !== 'undefined') {
            if (playerShips[opponentId][row][col] > 0) {
                io.to(socket.id).emit('esitoColpo', true, "Colpito!");
                console.log(`Colpo a segno da ${socket.id} su ${opponentId} in (${row}, ${col})`);
            } else {
                io.to(socket.id).emit('esitoColpo', false, "Mancato!");
                console.log(`Colpo mancato da ${socket.id} su ${opponentId} in (${row}, ${col})`);
            }
            io.to(users.find(id => id != socket.id)).emit('yourTurn', true);
        } else {
            console.error(`Errore: matrice dell'avversario ${opponentId} non trovata o cella non valida (${row}, ${col})`);
            socket.emit('errore', 'Matrice dell\'avversario non valida o cella inesistente.');
        }
    });

    // Handle disconnection
    socket.on('disconnect', function () {
        numClienti--;
        console.log(`Cliente disconnesso: ${socket.id}`);

        // Rimuovi l'utente disconnesso dalla lista
        const index = users.indexOf(socket.id);
        if (index !== -1) {
            users.splice(index, 1);
        }

        // Rimuovi la matrice delle navi dell'utente disconnesso
        delete playerShips[socket.id];

        io.emit('stato', users);
        console.log('Utenti connessi:', users);
    });

    //invia al client perdente il relatico messaggio
    socket.on('vittoria', (opponentId) => {
        io.to(opponentId).emit('sconfitta', "Hai perso...");
    });

    socket.on('rivincita', (opponentId)=>{
        io.to(opponentId).emit('rivincita')
    });
});


