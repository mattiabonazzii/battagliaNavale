function creaTabella(id) {
    for (let i = 1; i <= 10; i++) {
        document.write('<tr>');
        document.write(`<th>${i}</th>`);
        for (let j = 0; j < 10; j++) {
            const col = String.fromCharCode(65 + j);
            if (id==="attack")
            document.write(`<td id="${id}-${i}-${col}" onclick="markCell(${i}, '${col}')"></td>`);
        else
            document.write(`<td id="${id}-${i}-${col}"></td>`);
        }
        document.write('</tr>');
    }
}