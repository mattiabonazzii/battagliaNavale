document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("keydown", (event) => {    // Intercetta la pressione dei tasti

        if (event.key === "F5") {
            event.preventDefault();
            alert("Il ricaricamento è disabilitato!");
        } else if ((event.ctrlKey || event.metaKey) && event.key === "r") {
            event.preventDefault();
            alert("Il ricaricamento è disabilitato!");
        }
    });

    // Intercetta il tentativo di aggiornare tramite il menu contestuale
    window.onbeforeunload = (event) => {
        return "Sei sicuro di voler uscire dalla pagina?";
    };
});
