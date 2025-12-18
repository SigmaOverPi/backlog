function validatePassword() {
    let email = document.forms['signup-form']['email-field'].value;
    let password = document.forms["signup-form"]["pass-field"].value;
    let cue = document.getElementById("password-cue");
    let capitalChar = false;
    let specialChar = false;
    let numInPass = false;
    let specials = ["~", "`", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")"];
    let nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    let letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    let numOfLetters = 0;

    if (email.length == 0 && password.length == 0) {
        cue.innerHTML = "Enter email or password";
        return false;
    }

    if (password.length < 8) {
        cue.innerHTML = "Password must be at least 8 characters";
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
            cue.innerHTML = "Password must contain a letter";
            return false;
        } else if (!capitalChar) {
            cue.innerHTML = "Password must contain a capital letter"
            return false;
        } else if (!specialChar) {
            cue.innerHTML = "Password must contain a special character";
            return false;
        } else if (!numInPass) {
            cue.innerHTML = "Password must contain a number"
            return false;
        }

        else {
            alert("You're through!");
            return true;
        }
    }
}

btnSubmit.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passInput.value;

    if (!email || !password) {
        passwordCue.innerHTML = 'Please enter email and password';
        return;
    }
});