document.addEventListener('DOMContentLoaded', () => {
    // --- Éléments du DOM (correspondent à vos IDs dans index.html) ---
    const litresRestantDisplay = document.getElementById('litresRestant');
    const litresInitialInput = document.getElementById('litresInitial'); // Input pour "Litre Initial (Capacité Max.)"
    const saveInitialFuelButton = document.getElementById('saveInitialFuel'); // Bouton "Définir"
    const manualLitresInput = document.getElementById('manualLitres'); // Input pour "Quantité (Litres)" dans "Ajout Manuel"
    const addManualFuelButton = document.getElementById('addManualFuel'); // Bouton "Ajouter Manuellement"
    const manualMessage = document.getElementById('manualMessage'); // Paragraphe pour les messages

    // Éléments de l'horloge (inchangés car déjà fonctionnels)
    const hourHand = document.getElementById('hourHand');
    const minuteHand = document.getElementById('minuteHand');
    const secondHand = document.getElementById('secondHand');
    const digitalClock = document.getElementById('digitalClock');
    const currentDateDisplay = document.getElementById('currentDate');

    // Bouton pour l'historique
    const historyButton = document.getElementById('historyButton');

    // **NOTE Importante :** Votre HTML actuel n'a pas d'élément spécifique pour afficher la "Capacité Max."
    // ni de section pour "Consommer Manuellement".
    // Si vous souhaitez ces fonctionnalités visuelles, il faudra faire de très petites modifications dans index.html.
    // Je garde les références ici pour l'évolutivité, mais elles seront nulles si les éléments n'existent pas.
    const maxCapacityValueDisplay = document.getElementById('maxCapacityValue'); // Sera null si non ajouté dans HTML
    // const consumeLitresInput = document.getElementById('consumeLitres'); // Sera null si non ajouté dans HTML
    // const consumeManualFuelButton = document.getElementById('consumeManualFuel'); // Sera null si non ajouté dans HTML


  const API_BASE_URL = 'https://espace-caburant.onrender.com/api'; // NOUVELLE ADRESSE DE VOTRE BACKEND SUR RENDER

    // --- Fonctions utilitaires ---

    // Affiche un message temporaire à l'utilisateur
    const showMessage = (element, message, type) => {
        element.textContent = message;
        element.classList.remove('success', 'error');
        element.classList.add(type, 'show');
        setTimeout(() => {
            element.classList.remove('show');
            element.textContent = '';
        }, 3000);
    };

    // --- Fonctions d'interaction avec le backend (API) ---

    // Récupère le niveau de carburant actuel et la capacité maximale depuis le backend
    const fetchFuelData = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/fuel`);
            if (!response.ok) {
                // Gère le cas où aucune donnée de citerne n'est encore enregistrée (code 404)
                if (response.status === 404) {
                    console.warn("Citerne non trouvée sur le serveur. Veuillez définir la capacité initiale.");
                    litresRestantDisplay.textContent = '0.00 L'; // Réinitialise l'affichage
                    if (maxCapacityValueDisplay) maxCapacityValueDisplay.textContent = '0.00 L'; // Si l'élément existe
                    litresInitialInput.value = ''; // Efface le champ de capacité initiale
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Met à jour l'affichage avec les données reçues du backend
            litresRestantDisplay.textContent = `${data.litresRestant.toFixed(2)} L`;
            if (maxCapacityValueDisplay) maxCapacityValueDisplay.textContent = `${data.maxCapacity.toFixed(2)} L`; // Si l'élément existe
            
            // Pré-remplit le champ "Litre Initial" avec la capacité maximale actuelle si elle est définie
            if (data.maxCapacity > 0) {
                litresInitialInput.value = data.maxCapacity.toFixed(2);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des données de carburant:', error);
            showMessage(manualMessage, 'Erreur de connexion au serveur ou de récupération des données.', 'error');
        }
    };

    // --- Gestionnaires d'événements pour les boutons ---

    // Quand l'utilisateur clique sur "Définir" pour la capacité initiale
    saveInitialFuelButton.addEventListener('click', async () => {
        const initialCapacity = parseFloat(litresInitialInput.value);
        if (isNaN(initialCapacity) || initialCapacity <= 0) {
            showMessage(manualMessage, 'Veuillez entrer une capacité valide et positive.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/fuel/set_initial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Le backend attend un JSON avec la clé 'capacity'
                body: JSON.stringify({ capacity: initialCapacity }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors de la définition de la capacité initiale.');
            }
            showMessage(manualMessage, data.message, 'success');
            fetchFuelData(); // Rafraîchit l'affichage après la mise à jour
        } catch (error) {
            console.error('Erreur:', error);
            showMessage(manualMessage, `Erreur: ${error.message}`, 'error');
        }
    });

    // Quand l'utilisateur clique sur "Ajouter Manuellement"
    addManualFuelButton.addEventListener('click', async () => {
        const amountToAdd = parseFloat(manualLitresInput.value);

        if (isNaN(amountToAdd) || amountToAdd <= 0) {
            showMessage(manualMessage, 'Veuillez entrer une quantité positive à ajouter.', 'error');
            return;
        }

        // Vérifie si la capacité max est définie avant d'ajouter (via un appel au backend)
        const currentFuelDataResponse = await fetch(`${API_BASE_URL}/fuel`);
        const currentFuelData = currentFuelDataResponse.ok ? await currentFuelDataResponse.json() : null;

        if (!currentFuelData || currentFuelData.maxCapacity <= 0) {
            showMessage(manualMessage, 'Veuillez définir la capacité maximale avant d\'ajouter du carburant.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/fuel/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Le backend attend un JSON avec la clé 'amount'
                body: JSON.stringify({ amount: amountToAdd }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors de l\'ajout de carburant.');
            }
            showMessage(manualMessage, data.message, 'success');
            manualLitresInput.value = ''; // Réinitialise le champ d'entrée
            fetchFuelData(); // Rafraîchit l'affichage après l'ajout
        } catch (error) {
            console.error('Erreur:', error);
            showMessage(manualMessage, `Erreur: ${error.message}`, 'error');
        }
    });

    // --- Logique pour "Consommer Manuellement" (actuellement absente de votre HTML) ---
    // Si vous ajoutez un bouton et un champ pour consommer, décommentez le bloc ci-dessous
    /*
    if (typeof consumeManualFuelButton !== 'undefined' && consumeManualFuelButton !== null) { // Vérifie si le bouton existe dans le HTML
        consumeManualFuelButton.addEventListener('click', async () => {
            const amountToConsume = parseFloat(consumeLitresInput.value);

            if (isNaN(amountToConsume) || amountToConsume <= 0) {
                showMessage(manualMessage, 'Veuillez entrer une quantité positive à consommer.', 'error');
                return;
            }

            const currentFuelDataResponse = await fetch(`${API_BASE_URL}/fuel`);
            const currentFuelData = currentFuelDataResponse.ok ? await currentFuelDataResponse.json() : null;

            if (!currentFuelData || currentFuelData.maxCapacity <= 0) {
                showMessage(manualMessage, 'Veuillez définir la capacité maximale avant de consommer du carburant.', 'error');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/fuel/consume`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // Le backend attend un JSON avec la clé 'amount'
                    body: JSON.stringify({ amount: amountToConsume }),
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Erreur lors de la consommation de carburant.');
                }
                showMessage(manualMessage, data.message, 'success');
                consumeLitresInput.value = ''; // Réinitialise le champ
                fetchFuelData(); // Rafraîchit l'affichage après la consommation
            } catch (error) {
                console.error('Erreur:', error);
                showMessage(manualMessage, `Erreur: ${error.message}`, 'error');
            }
        });
    }
    */

    // Redirection vers la page d'historique
    historyButton.addEventListener('click', () => {
        window.location.href = '/historique';
    });

    // --- Fonctions pour l'horloge (aucune modification nécessaire) ---
    const updateClock = () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        // Digital Clock
        digitalClock.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        currentDateDisplay.textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Analog Clock
        const secondsDegrees = ((seconds / 60) * 360) + 90;
        const minutesDegrees = ((minutes / 60) * 360) + ((seconds / 60) * 6) + 90;
        const hoursDegrees = ((hours / 12) * 360) + ((minutes / 60) * 30) + 90;

        secondHand.style.transform = `rotate(${secondsDegrees}deg)`;
        minuteHand.style.transform = `rotate(${minutesDegrees}deg)`;
        hourHand.style.transform = `rotate(${hoursDegrees}deg)`;
    };

    // --- Initialisation de la page ---
    fetchFuelData(); // Charge les données initiales dès le chargement de la page
    updateClock(); // Met à jour l'horloge immédiatement
    setInterval(updateClock, 1000); // Met à jour l'horloge toutes les secondes

    // Rafraîchit les données de carburant depuis le backend toutes les 5 secondes
    // Cela permet de refléter les mises à jour provenant de l'ESP32 ou d'autres sources.
    setInterval(fetchFuelData, 5000);
});