import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { rawgApiKey } from "./config.js";

const apikey = rawgApiKey;

//* Elements
const welcomeMsg = document.getElementById('welcome-msg');
const tableBody = document.getElementById('played-table-body');
const activityContainer = document.getElementById('activity-container');
const featuredContainer = document.getElementById('featured-container');
const statTotal = document.getElementById('stat-total');
const statHours = document.getElementById('stat-hours');

//* Auth listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        //* Set username
        //* Uses displayName if available, otherwise uses email name before the @
        const name = user.displayName || user.email.split('@')[0];
        welcomeMsg.innerText = `Welcome back, ${name}!`;

        //* Load user data
        loadCompletedGames(user.uid);
        loadRecentActivity(user.uid);

        //* Load external API data
        loadFeaturedGames();
    } else {
        window.location.href = 'login.html';
    }
});

//* Helper function to load completed games
async function loadCompletedGames(uid) {
    try {
        //* Fetch completed games and sort by latest
        const q = query(collection(db, `users/${uid}/completed_games`), orderBy('dateCompleted', 'desc'), limit(10));
        const snapshot = await getDocs(q);

        tableBody.innerHTML = ''; //* Clear loading text

        let totalHours = 0;
        let totalGames = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            totalGames++;
            totalHours += parseInt(data.hours) || 0;

            const row = `
                <tr>
                    <td style="align-items: center; gap: 10px;">
                        <a href="gamepage.html?id=${data.gameId}" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 10px;">
                            <img src="${data.image || 'backlog.png'}" style="width:30px; height:30px; object-fit:cover; border-radius:4px;"> 
                            <span style="font-weight: bold;">${data.gameName}</span>
                        </a>
                    </td>
                    <td>${data.platform}</td>
                    <td>${data.hours} hrs</td>
                </tr>
            `;

            tableBody.innerHTML += row;
        });

        //* Update stat cards
        statTotal.innerText = totalGames;
        statHours.innerText = totalHours.toLocaleString();

        if (snapshot.empty) {
            tableBody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px;'>No games completed yet. Go mark some as played!</td></tr>";
        }
    } catch (error) {
        console.error('Error loading completed games: ', error);
        tableBody.innerHTML = "<tr><td colspan='4'>Error loading data.</td></tr>";
    }
}


//* Helper function to load recent activity
async function loadRecentActivity(uid) {
    try {
        const q = query(collection(db, `users/${uid}/recent_activity`), orderBy('timestamp', 'desc'), limit(5));
        const snapshot = await getDocs(q);

        activityContainer.innerHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();

            //* Calculate 'Time Ago'
            let timeString = 'Just now';
            if (data.timestamp) {
                const date = data.timestamp.toDate();
                timeString = timeAgo(date);
            }

            const item = `
                <div class="card-item">
                    <div class="stat-img">
                         <img src="${data.gameImage || 'backlog.png'}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
                    </div>

                    <div class="stat-info">
                        <p>${data.message}</p>
                        <p style="color: grey; font-size:12px;">${timeString}</p>
                    </div>
                </div>
            `;
            activityContainer.innerHTML += item;
        });

        if (snapshot.empty) {
            activityContainer.innerHTML = "<p style='color:grey; padding:10px'>No recent activity.</p>";
        }
    } catch (error) {
        console.error('Error loading activity: ', error);
    }
}

//* Load Featured Games from RAWG
async function loadFeaturedGames() {
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const day = currentDate.getDate();
        const month = currentDate.getMonth();
        //* Get popular games within the past year sort by rating
        const url = `https://api.rawg.io/api/games?key=${apikey}&dates=${currentYear - 1}-${month}-${day},${currentYear}-${month}-${day}&ordering=-rating&page_size=3`;
        const res = await fetch(url);
        const data = await res.json();

        featuredContainer.innerHTML = '';

        data.results.forEach(game => {
            const card = `
                <a href="gamepage.html?id=${game.id}" class="card-item" style="text-decoration: none; color: inherit; display: flex; align-items: start; gap: 15px; padding: 10px; border-radius: 8px;">
                    <div class="game-img" style="width: 50px; height: 50px; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
                        <img src="${game.background_image}" alt="game-icon" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>

                    <div class="game-info">
                        <p style="font-weight:bold; font-size:14px; margin:0;">${game.name}</p>
                        <p style="color: grey; font-size:12px; margin:2px 0;">${game.released}</p>
                        <p style="font-size:12px;">⭐️ ${game.rating} (${game.ratings_count})</p>
                    </div>
                </a>
            `;
            featuredContainer.innerHTML += card;
        })
    } catch (error) {
        console.error('Error loading featured: ', error);
        featuredContainer.innerHTML = "<p>Could not load featured games.</p>";
    }
}

//* Helper function to calculate 'Time Ago;
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return "Just now";
}