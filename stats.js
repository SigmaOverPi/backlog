import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

window.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadStats(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    // Filter Button Logic (Visual only for now)
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
});

async function loadStats(uid) {
    try {
        //* Query 1: Completed Games (for Hours, Avg, Charts)
        const completedQ = query(collection(db, `users/${uid}/completed_games`));
        const completedSnapshot = await getDocs(completedQ);

        //* Query 2: Logged Games (Total Games Added count)
        const loggedQ = query(collection(db, `users/${uid}/recent_activity`), where('type', '==', 'Log'));
        const loggedSnapshot = await getDocs(loggedQ);

        //* Stats Calculation
        const totalLoggedGames = loggedSnapshot.size; //* Accurate "Backlog" count

        let completedGamesCount = 0;
        let totalHours = 0;
        let platformCounts = {};
        let gamesData = [];

        completedSnapshot.forEach(doc => {
            const data = doc.data();
            const hours = parseFloat(data.hours) || 0;
            const platform = data.platform || 'Unknown';

            completedGamesCount++;
            totalHours += hours;

            // Platform counts
            platformCounts[platform] = (platformCounts[platform] || 0) + 1;

            // Game data for Top 5
            gamesData.push({
                name: data.gameName,
                hours: hours
            });
        });

        const avgHours = completedGamesCount > 0 ? (totalHours / completedGamesCount).toFixed(1) : 0;

        // Find most played platform
        let topPlatform = 'N/A';
        let maxCount = 0;
        for (const [p, count] of Object.entries(platformCounts)) {
            if (count > maxCount) {
                maxCount = count;
                topPlatform = p;
            }
        }

        // Sort games by hours for chart
        gamesData.sort((a, b) => b.hours - a.hours);
        const top5Games = gamesData.slice(0, 5);

        updateUI(totalLoggedGames, avgHours, topPlatform, top5Games, platformCounts, completedGamesCount);

    } catch (e) {
        console.error("Error loading stats: ", e);
    }
}


function updateUI(totalGames, avgHours, topPlatform, top5Games, platformCounts, countTotal) {
    // 1. KPI Cards
    document.getElementById('total-games').innerText = totalGames.toLocaleString();
    document.getElementById('avg-hours').innerText = `${avgHours} hours`;
    document.getElementById('top-genre').innerText = topPlatform; // Using element ID 'top-genre' but showing platform

    // 2. Top Games Chart
    const chartContainer = document.getElementById('chart-container');
    chartContainer.innerHTML = '';

    if (top5Games.length === 0) {
        chartContainer.innerHTML = '<p style="color:grey; width:100%; text-align:center;">No data available</p>';
    } else {
        // Find max hours to scale bars
        const maxHours = top5Games[0].hours;

        top5Games.forEach((game, index) => {
            const percentage = (game.hours / maxHours) * 100;
            const isHighlight = index === 0 ? 'highlight' : ''; // Highlight the top one

            const barWrapper = `
                <div class="bar-wrapper">
                    <div class="bar ${isHighlight}" style="height: ${percentage}%;">
                         <span class="bar-value">${game.hours}h</span>
                    </div>
                    <div class="bar-label" title="${game.name}">${game.name.length > 8 ? game.name.substring(0, 6) + '..' : game.name}</div>
                </div>
            `;
            chartContainer.innerHTML += barWrapper;
        });
    }


    // 3. Platform Distribution
    const platformList = document.getElementById('platform-list');
    platformList.innerHTML = '';

    const sortedPlatforms = Object.entries(platformCounts).sort((a, b) => b[1] - a[1]);

    sortedPlatforms.forEach(([platform, count]) => {
        const percentage = countTotal > 0 ? ((count / countTotal) * 100).toFixed(0) : 0;

        const item = `
            <div class="progress-item">
                <div class="platform-name">${platform}</div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${percentage}%;"></div>
                </div>
            </div>
        `;
        platformList.innerHTML += item;
    });

    if (sortedPlatforms.length === 0) {
        platformList.innerHTML = '<p style="color:grey;">No platforms logged.</p>';
    }
}
