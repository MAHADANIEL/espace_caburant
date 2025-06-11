document.addEventListener('DOMContentLoaded', () => {
    const secretCodeInput = document.getElementById('secretCode');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');

    const correctSecretCode = '180605'; // Votre code secret

    const handleLogin = () => {
        const enteredCode = secretCodeInput.value;
        if (enteredCode === correctSecretCode) {
            localStorage.setItem('loggedIn', 'true');
            window.location.href = 'index.html';
        } else {
            errorMessage.textContent = 'Code secret incorrect. Veuillez réessayer.';
            errorMessage.classList.add('show');
            setTimeout(() => {
                errorMessage.classList.remove('show');
                errorMessage.textContent = ''; // Clear message after hiding
            }, 3000); // Message disparaît après 3 secondes
            secretCodeInput.value = ''; // Efface le champ
            secretCodeInput.focus();
        }
    };

    loginButton.addEventListener('click', handleLogin);

    secretCodeInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleLogin();
        }
    });
});