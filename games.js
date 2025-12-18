import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { rawgApiKey } from "./config.js";

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

const apikey = rawgApiKey;
const searchInput = document.getElementById('game-search');
const resultsContainer = document.getElementById('results-container');

//* To track timer
let searchTimeoutToken = 0;


//* Event lisstener for typing
searchInput.addEventListener('input', (event) => {
    const query = event.target.value;

    //* Clear the timer every time the user types a new key
    //* This effectively 'cancels' the previous search request if it hasn't been fired yet
    clearTimeout(searchTimeoutToken);

    //* Reset container if input is empty
    if (query.length === 0) {
        resultsContainer.innerHTML = '';
        return;
    }

    //* Set a new timer. The searchGames function will only run if the user stops typing for 500ms
    searchTimeoutToken = setTimeout(() => {
        if (query.length > 2) {
            searchGames(query);
        }
    }, 500);
});

//* Fetch function
async function searchGames(query) {
    //* Show 'loading...' while fetching
    resultsContainer.innerHTML = '<div class="loading">Searching...</div>';

    const url = `https://api.rawg.io/api/games?key=${apikey}&search=${query}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        displayResults(data.results);
    } catch (error) {
        console.error('Error fetching games: ', error);
    }
}

//* Render function
function displayResults(games) {
    resultsContainer.innerHTML = '';

    games.forEach(game => {
        //* Create card container
        const card = document.createElement('div');
        card.classList.add('game-card');

        //* Handle cases where game has no image
        const imageSrc = game.background_image ? game.background_image : 'backlog.png';

        //* Construct the HTML
        card.innerHTML = `
        <img src="${imageSrc}" alt="${game.name}">
        <div class="game-info">
            <div class="game-title">${game.name}</div>
            <small>Released: ${game.released}</small>
        </div>
        `;

        //* Add click event to "log" the game for future uses
        card.addEventListener('click', () => {
            console.log(`User clicked on: ${game.name} (ID: ${game.id})`);
            alert(`You selected: ${game.name}`);
            window.location.href = `gamepage.html?id=${game.id}`;
        });

        resultsContainer.appendChild(card);
    });
}