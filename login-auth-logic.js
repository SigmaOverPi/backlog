import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword }
    from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const emailInput = document.getElementById('email-field');
const passInput = document.getElementById('password-field');
const btnSubmit = document.getElementById('submit-btn');
const cue = document.getElementById('password-cue');

btnSubmit.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passInput.value;

    if (!email || !password) {
        showError("Please enter email and password.");
        return
    }

    cue.innerHTML = "";

    try {
        btnSubmit.value = 'Logging in...';
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "dashboard.html";
    } catch (error) {
        console.error(error);
        btnSubmit.value = 'Log In';

        let message = error.message;
        // Simplify Firebase error messages
        if (error.code === 'auth/invalid-credential') { message = "Invalid email or password." };

        showError(message);
    }
});

function showError(msg) {
    cue.innerHTML = msg;
}