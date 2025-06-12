document.addEventListener('DOMContentLoaded', () => {
    const secretCodeInput = document.getElementById('secretCode');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');

    const correctSecretCode = '180605'; // Ton code secret

    const handleLogin = () => {
        const enteredCode = secretCodeInput.value;
        if (enteredCode === correctSecretCode) {
            localStorage.setItem('loggedIn', 'true');
           window.location.href = '/index'; // ✅ Redirige vers la page d’accueil
        } else {
            errorMessage.textContent = 'Code secret incorrect. Veuillez réessayer.';
            errorMessage.classList.add('show');
            setTimeout(() => {
                errorMessage.classList.remove('show');
                errorMessage.textContent = '';
            }, 3000);
            secretCodeInput.value = '';
            secretCodeInput.focus();
        }
    };

    loginButton.addEventListener('click', handleLogin);
});