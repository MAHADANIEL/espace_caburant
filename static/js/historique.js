document.addEventListener('DOMContentLoaded', () => {
    const historyTableBody = document.querySelector('#historyTable tbody');
    const backButton = document.getElementById('backButton');
    const emptyHistoryMessage = document.getElementById('emptyHistoryMessage');

    // Assurez-vous que c'est l'adresse de votre backend Flask
    // J'ai renommé pour plus de clarté, mais l'URL de base reste la même
    const API_ROOT_URL = 'http://127.0.0.1:5000/api'; 

    // --- Fonctionnalité de connexion ---
    const checkLogin = () => {
        if (localStorage.getItem('loggedIn') !== 'true') {
            // CORRECTION: Rediriger vers la page de login, pas vers l'historique
            window.location.href = '/login'; 
        }
    };
    checkLogin();

    // --- Fonction pour récupérer et afficher l'historique ---
    const fetchHistory = async () => {
        try {
            // CORRECTION: Utilisation de la route API correcte comme définie dans app.py
            const response = await fetch(`${API_ROOT_URL}/distribution_history`); 
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const historyData = await response.json();

            historyTableBody.innerHTML = ''; // Effacer le contenu actuel du tableau

            // Assurez-vous que historyData.history existe et est un tableau
            const historyList = historyData.history || []; 

            if (historyList.length === 0) {
                emptyHistoryMessage.style.display = 'block'; // Afficher le message si pas d'historique
                historyTableBody.style.display = 'none'; // Cacher le tableau vide
            } else {
                emptyHistoryMessage.style.display = 'none';
                historyTableBody.style.display = 'table-row-group'; // Afficher le corps du tableau

                historyList.forEach(entry => {
                    const row = historyTableBody.insertRow();
                    // Assurez-vous que 'type' dans l'entrée correspond à 'manual_consumption' ou 'hardware_consumption' de votre DB
                    // J'ai ajusté la logique pour correspondre aux noms de types de votre DB
                    row.classList.add(entry.type === 'manual_consumption' ? 'manual-entry' : 'auto-entry'); 

                    const litresCell = row.insertCell();
                    litresCell.textContent = `${parseFloat(entry.amount_distributed).toFixed(2)} L`; // Utiliser 'amount_distributed'

                    const dateCell = row.insertCell();
                    // Extraire la date de 'timestamp' (format ISO 8601)
                    dateCell.textContent = new Date(entry.timestamp).toLocaleDateString('fr-FR');

                    const timeCell = row.insertCell();
                    // Extraire l'heure de 'timestamp' (format ISO 8601)
                    timeCell.textContent = new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                    const typeCell = row.insertCell();
                    // Adapter le type pour l'affichage
                    let displayType = entry.type.replace('_consumption', '').replace('manual', 'Manuel').replace('hardware', 'Automatique');
                    typeCell.textContent = displayType.charAt(0).toUpperCase() + displayType.slice(1);
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
        // CORRECTION: Rediriger vers la route Flask '/index', pas vers le fichier 'index.html'
        window.location.href = '/index'; 
    });

    // Charger l'historique au chargement de la page
    fetchHistory();
});