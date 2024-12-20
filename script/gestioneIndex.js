const socket = io.connect('http://127.0.0.1:3000/');

let opponentId;
let pezzi_avversari = 21;
let shipGrid = []; // Matrice delle navi (10x10)
let isMyTurn;

socket.on('stato', (numClienti, users) => {
    // Seleziona un avversario (esempio: il primo ID diverso dal proprio)
    opponentId = users.find(id => id !== socket.id);
});

socket.on('yourTurn', isYourTurn => {
    isMyTurn = isYourTurn;
    document.getElementById('textArrabbiato').innerHTML = ''
    cntArrabbiato = 1;
    document.getElementById('textEsito').innerHTML = 'È il tuo turno!'
});

socket.on('disconnettiti', messaggio => {
    socket.disconnect();
    document.body.innerHTML = messaggio;
})

socket.on('errore', (messaggio) => {
    alert(messaggio);
})

socket.on('esitoColpo', (esito, messaggio) => {
    const paragrafo = document.getElementById('textEsito');
    if (esito) {
        document.getElementById(`attack-${hitRow}-${hitCol}`).style.backgroundColor = "red"; //prende l'indirizzo della colonna
        pezzi_avversari -= 1;
        paragrafo.innerText = messaggio;
        document.getElementById("textPezziAvversari").innerHTML = `${messaggio} Mancano: ${pezzi_avversari} segmenti`;
        document.getElementById("textAffondata").innerHTML = '';
        if (pezzi_avversari === 0) //se si ha vinto, non manda il classico messaggio ma richiama il metodo
            terminaGioco();
    }
    else{
        paragrafo.innerText = messaggio; //colpo mancato
        document.getElementById("textAffondata").innerHTML = '';
    }
        

})

socket.on('barcaColpita', ({ row, col }) =>{ //Richiamata dal server. Colora la casella di rosso se si viene colpiti
    console.log(row, ' ',col);
    r = row + 1;
    c = String.fromCharCode((col + 65));
    document.getElementById(`cell-${r}-${c}`).style.backgroundColor = "red";
    document.getElementById(`cell-${r}-${c}`).innerHTML = "x";
})

socket.on('barcaAffondata', (messaggio) => {
    document.getElementById("textAffondata").innerHTML = messaggio;
})

//sul socket perdente, verra' richiamato
socket.on('sconfitta', () => {
    disabilitaGriglia();
    mostraBottoneRivincita();
    document.getElementById("esitoPartita").innerHTML = "Hai Perso!";
})

socket.on('rivincita', () => { //ricarica la pagina
    location.reload();
})


//###########

function sendHit(row, col, opponent) {
    socket.emit('colpo', row - 1, col.charCodeAt(0) - 65, opponent);
}

let hitRow; //le inizializzo nel markcell, vengono utilizzate poi per capire quale casella colorare di rosso
let hitCol;
let cntArrabbiato = 1;
let dimensioneArrabbiato = 10;

//Metodo per marcare la cella della tabella avversaria
function markCell(row, col) {
    if (isMyTurn) {
        hitRow = row;
        hitCol = col;

        const cell = document.getElementById(`attack-${row}-${col}`); //prende l'indirizzo della colonna
        if (cell.innerHTML === "X") // Controlla se la cella è già stata marcata
            return;

        sendHit(row, col, opponentId);
        isMyTurn = false;
        cell.innerHTML = "X";// altrimenti marca la cella con una X
    } else {
        let str = (cntArrabbiato * dimensioneArrabbiato).toString() + 'px';
        document.getElementById('textArrabbiato').style.fontSize = str;
        document.getElementById('textArrabbiato').innerHTML = 'Non è il tuo turno!';

        if (cntArrabbiato < 4) { //aumenta la dimensione del testo fino a max 40px (diminuito da 70px per evitare pagine troppo grandi su schermi piccoli)
            cntArrabbiato++;
        }
    }
}



function initializeGrid() {
    shipGrid = Array.from({ length: 10 }, () => Array(10).fill(0)); //Crea e popola la matrice con 0
}

function placeShips() {
    initializeGrid()
    const rows = 10;
    const cols = 10;

    const navi = [
        { name: 'corazzata', size: 4, count: 1, id: 1 },
        { name: 'sottomarino', size: 3, count: 3, id: 2 },
        { name: 'corvetta', size: 2, count: 3, id: 3 },
        { name: 'lancia', size: 1, count: 2, id: 4 }
    ];

    // Verifica se è possibile posizionare una nave
    function canPlaceShip(x, y, size, direction) {
        if (direction === 'horizontal' && y + size > cols) return false;
        if (direction === 'vertical' && x + size > rows) return false;

        for (let i = 0; i < size; i++) {
            const placeX = direction === 'horizontal' ? x : x + i;
            const placeY = direction === 'horizontal' ? y + i : y;
            if (shipGrid[placeX][placeY] !== 0) return false;
        }

        return true;
    }

    let idNave = 0;
    let arrayNavi = [];
    // Posiziona una nave nella matrice e aggiorna la griglia HTML
    function placeShip(x, y, size, direction, className) {
        for (let i = 0; i < size; i++) {
            const placeX = direction === 'horizontal' ? x : x + i;
            const placeY = direction === 'horizontal' ? y + i : y;

            shipGrid[placeX][placeY] = size;
            strId = `${placeX}${placeY}`;
            temp = shipGrid[placeX][placeY].toString() + String.fromCharCode(idNave+65);
            arrayNavi.push({strId, temp});
            const cellId = `cell-${placeX + 1}-${String.fromCharCode(65 + placeY)}`;
            const cell = document.getElementById(cellId);
            cell.classList.add(className);
        }
        idNave++;
    }

    // Genera le navi
    navi.forEach(nave => {
        for (let i = 0; i < nave.count; i++) {
            let placed = false;
            while (!placed) {
                const x = Math.floor(Math.random() * rows);
                const y = Math.floor(Math.random() * cols);
                const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';

                if (canPlaceShip(x, y, nave.size, direction)) {
                    placeShip(x, y, nave.size, direction, nave.name);
                    placed = true;
                }
            }
        }
    });
    console.log(arrayNavi)
    socket.emit('idNavi', arrayNavi);
    socket.emit('naviPosizionate', shipGrid);
}


function terminaGioco() {
    document.getElementById("esitoPartita").innerHTML = "Hai vinto!";

    socket.emit('vittoria', opponentId);
    disabilitaGriglia();
    mostraBottoneRivincita();
}

function mostraBottoneRivincita() {
    document.getElementById("buttonRivincita").style.display = "block";
}

function rivincita() {
    socket.emit('rivincita', opponentId); //Chiamata al server che ricarica anche la pagina dell'avversario
    location.reload(); //ricarica la pagina locale
}

//da usare una volta terminata la partita
function disabilitaGriglia() {
    const playerGrid = document.getElementById('playerGrid');
    playerGrid.style.pointerEvents = 'none';
}

// Richiama la funzione per posizionare le navi
placeShips();
