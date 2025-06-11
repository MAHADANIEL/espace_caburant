document.addEventListener('DOMContentLoaded', () => {
    const historyTableBody = document.querySelector('#historyTable tbody');
    const backButton = document.getElementById('backButton');
    const emptyHistoryMessage = document.getElementById('emptyHistoryMessage');

    const API_BASE_URL = 'http://127.0.0.1:5000/api'; // Assurez-vous que c'est l'adresse de votre backend Flask

    // --- Fonctionnalité de connexion ---
    const checkLogin = () => {
        if (localStorage.getItem('loggedIn') !== 'true') {
            window.location.href = 'login.html';
        }
    };
    checkLogin();

    // --- Fonction pour récupérer et afficher l'historique ---
    const fetchHistory = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/history`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const historyData = await response.json();

            historyTableBody.innerHTML = ''; // Effacer le contenu actuel du tableau

            if (historyData.length === 0) {
                emptyHistoryMessage.style.display = 'block'; // Afficher le message si pas d'historique
                historyTableBody.style.display = 'none'; // Cacher le tableau vide
            } else {
                emptyHistoryMessage.style.display = 'none';
                historyTableBody.style.display = 'table-row-group'; // Afficher le corps du tableau

                historyData.forEach(entry => {
                    const row = historyTableBody.insertRow();
                    row.classList.add(entry.type === 'manuel' ? 'manual-entry' : 'auto-entry'); // Ajouter une classe pour le style

                    const litresCell = row.insertCell();
                    litresCell.textContent = `${parseFloat(entry.litres).toFixed(2)} L`;

                    const dateCell = row.insertCell();
                    dateCell.textContent = entry.date;

                    const timeCell = row.insertCell();
                    timeCell.textContent = entry.time;

                    const typeCell = row.insertCell();
                    typeCell.textContent = entry.type.charAt(0).toUpperCase() + entry.type.slice(1); // Majuscule au début
                });
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            historyTableBody.innerHTML = `<tr><td colspan="4" style="color: #ff6b6b;">Erreur lors du chargement de l'historique.</td></tr>`;
            emptyHistoryMessage.style.display = 'none'; // S'assurer que le message d'erreur est visible si le tableau n'est pas rempli
        }
    };

    // --- Événements ---
    backButton.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Charger l'historique au chargement de la page
    fetchHistory();
});