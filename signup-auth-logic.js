import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const usernameInput = document.getElementById('username-field');
const emailInput = document.getElementById('email-field');
const passInput = document.getElementById('password-field');
const btnSubmit = document.getElementById('submit-btn');
const cue = document.getElementById('password-cue');

btnSubmit.addEventListener('click', async () => {
    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passInput.value;

    cue.innerHTML = '';

    if (validatePassword(username, email, password)) {
        try {
            btnSubmit.value = 'Creating account...';
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await updateProfile(user, { displayName: username });
            btnSubmit.value = 'Account Created!';
            window.location.href = "dashboard.html";
        } catch (error) {
            console.error(error);
            let message = error.message;
            showError(message);
        }

    }

});

function showError(msg) {
    cue.innerHTML = msg;
}

function validatePassword(username, email, password) {
    let cue = document.getElementById("password-cue");
    let capitalChar = false;
    let specialChar = false;
    let numInPass = false;
    let specials = ["~", "`", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")"];
    let nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    let letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    let numOfLetters = 0;

    if (username == "" || email == "" || password == "") {
        showError("Please enter username, email and password.");
        return;
    }

    if (password.length < 8) {
        showError("Password must be at least 8 characters");
        return false;
    } else if (password.length >= 8) {

        //* Check if a letter exists in the password
        for (let i = 0; i < password.length; i++) {
            for (let j = 0; j < letters.length; j++) {
                if (password.charAt(i) == letters.at(j) || password.charAt(i) == letters.at(j).toUpperCase()) {
                    numOfLetters++;
                }
            }
        }

        //* Checks for capital letter in password
        for (let i = 0; i < password.length; i++) {
            for (let j = 0; j < letters.length; j++) {
                if ((password.charAt(i) == letters.at(j) || password.charAt(i) == letters.at(j).toUpperCase()) && password.charAt(i) == password.charAt(i).toUpperCase()) {
                    capitalChar = true;
                }
            }
        }

        //* Checks for special character in password
        for (let i = 0; i < password.length; i++) {
            for (let j = 0; j < specials.length; j++) {
                if (password.charAt(i) == specials.at(j)) {
                    specialChar = true;
                }
            }
        }

        //* Checks for number in password
        for (let i = 0; i < password.length; i++) {
            for (let j = 0; j < nums.length; j++) {
                if (password.charAt(i) == nums.at(j)) {
                    numInPass = true;
                }
            }
        }

        console.log(numOfLetters);
        console.log(capitalChar);
        console.log(specialChar);
        console.log(numInPass);

        if (numOfLetters == 0) {
            showError("Password must contain a letter");
            return false;
        } else if (!capitalChar) {
            showError("Password must contain a capital letter");
            return false;
        } else if (!specialChar) {
            showError("Password must contain a special character");
            return false;
        } else if (!numInPass) {
            showError("Password must contain a number");
            return false;
        }

        else {
            return true;
        }
    }
}