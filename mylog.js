import { db, auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { collection, getDocs, query, addDoc, serverTimestamp, deleteDoc, doc, where, orderBy } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

let allGames = []; // Stores combined list for filtering

window.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            setupProfile(user);
            await migrateLocalBacklog(user.uid); //* One-time migration
            loadGameLog(user.uid);
            loadUserReviews(user); //* Load reviews
            loadUserForums(user); //* Load forums
        } else {
            window.location.href = 'login.html';
        }
    });

    // Search & Filter Listeners
    document.getElementById('search-input').addEventListener('input', filterGames);
    document.getElementById('filter-status').addEventListener('change', filterGames);
    document.getElementById('sort-by').addEventListener('change', filterGames);

    // Tab Listeners
    setupTabs();

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Error logging out', error);
        });
    });
});

function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const viewLog = document.getElementById('view-log');
    const viewReviews = document.getElementById('view-reviews');
    const viewForums = document.getElementById('view-forums');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            viewLog.classList.add('hidden');
            viewReviews.classList.add('hidden');
            viewForums.classList.add('hidden');

            if (tab.innerText === 'Game Log') {
                viewLog.classList.remove('hidden');
            } else if (tab.innerText === 'Reviews') {
                viewReviews.classList.remove('hidden');
            } else if (tab.innerText === 'Forums') {
                viewForums.classList.remove('hidden');
            }
        });
    });
}

function setupProfile(user) {
    const name = user.displayName || user.email.split('@')[0];
    document.getElementById('user-name').innerText = name;
    document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${name}&background=random`;

    //* Set real member since date
    if (user.metadata.creationTime) {
        const date = new Date(user.metadata.creationTime);
        const options = { month: 'short', year: 'numeric' };
        const joinedDate = date.toLocaleDateString('en-US', options);
        document.getElementById('member-since').innerText = `Member since ${joinedDate}`;
    }
}

async function loadUserReviews(user) {
    const container = document.getElementById('reviews-grid');
    const username = user.displayName || user.email.split('@')[0];

    try {
        const q = query(collection(db, 'reviews'), where('user', '==', username));
        const snapshot = await getDocs(q);

        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = '<p style="color:grey;">No reviews written yet.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Recently';

            const card = `
                <div class="review-card">
                    <div class="review-header">
                        <span class="review-game-title">${data.gameName || 'Unknown Game'}</span>
                        <span class="review-rating">${data.rating}/5 ★</span>
                    </div>
                    <p class="review-text">${data.text}</p>
                    <div class="review-date">${date}</div>
                </div>
            `;
            container.innerHTML += card;
        });

    } catch (error) {
        console.error("Error loading reviews:", error);
        container.innerHTML = '<p style="color:red;">Error loading reviews.</p>';
    }
}

async function loadUserForums(user) {
    const container = document.getElementById('forums-grid');
    const username = user.displayName || user.email.split('@')[0];

    try {
        // Query forum_posts by author (user field)
        const q = query(collection(db, 'forum_posts'), where('user', '==', username));
        const snapshot = await getDocs(q);

        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = '<p style="color:grey;">No forum posts yet.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Recently';
            // Truncate content
            const preview = data.content.length > 100 ? data.content.substring(0, 100) + '...' : data.content;

            const card = `
                <div class="review-card">
                    <div class="review-header">
                        <span class="review-game-title" style="color: #60a5fa;">${data.title}</span>
                    </div>
                    <p class="review-text">${preview}</p>
                    <div class="review-date">Posted on ${date}</div>
                </div>
            `;
            container.innerHTML += card;
        });

    } catch (error) {
        console.error("Error loading forums:", error);
        container.innerHTML = '<p style="color:red;">Error loading forum posts.</p>';
    }
}

//* One-time migration from LocalStorage to Firestore
async function migrateLocalBacklog(uid) {
    const localGames = JSON.parse(localStorage.getItem('myGames'));

    if (localGames && localGames.length > 0) {
        console.log("Migrating local backlog to cloud...", localGames);
        try {
            const backlogRef = collection(db, `users/${uid}/backlog`);

            for (const game of localGames) {
                await addDoc(backlogRef, {
                    gameId: game.id,
                    gameName: game.name,
                    image: game.image,
                    genre: 'Unknown', // Local storage didn't have genre
                    timestamp: serverTimestamp()
                });
            }

            //* Clear local storage after successful upload
            localStorage.removeItem('myGames');
            console.log("Migration complete. Local backlog cleared.");
            alert("Your backlog has been synced to the cloud!");

        } catch (e) {
            console.error("Migration failed:", e);
        }
    }
}

async function loadGameLog(uid) {
    try {
        // 1. Fetch Completed Games (Firestore)
        const qCompleted = query(collection(db, `users/${uid}/completed_games`));
        const snapshotCompleted = await getDocs(qCompleted);

        const completedGames = [];
        let totalHours = 0;
        let platformCounts = {};

        snapshotCompleted.forEach(doc => {
            const data = doc.data();
            const hours = parseFloat(data.hours) || 0;
            totalHours += hours;
            const platform = data.platform || 'Unknown';
            platformCounts[platform] = (platformCounts[platform] || 0) + 1;

            completedGames.push({
                id: data.gameId || doc.id,   // RAWG ID
                firestoreId: doc.id,         // Firestore ID (for delete)
                title: data.gameName,
                platform: platform,
                hours: hours,
                status: 'Completed',
                image: data.image,
                timestamp: data.dateCompleted
            });
        });

        // 2. Fetch Backlog Games (Firestore)
        const qBacklog = query(collection(db, `users/${uid}/backlog`));
        const snapshotBacklog = await getDocs(qBacklog);

        const backlogGames = [];
        snapshotBacklog.forEach(doc => {
            const data = doc.data();
            backlogGames.push({
                id: data.gameId,             // RAWG ID
                firestoreId: doc.id,         // Firestore ID (for delete)
                title: data.gameName,
                platform: 'Backlog',
                hours: 0,
                status: 'In Library',
                image: data.image,
                timestamp: data.timestamp
            });
        });

        // 3. Merge Lists (Prioritize Completed status if game exists in both)
        const gameMap = new Map();

        // Add backlog first
        backlogGames.forEach(g => gameMap.set(String(g.id), g));

        // Add/Overwrite with completed
        completedGames.forEach(g => gameMap.set(String(g.id), g));

        allGames = Array.from(gameMap.values());

        // 4. Update Stats
        const totalCompleted = completedGames.length;
        const avgHours = totalCompleted > 0 ? (totalHours / totalCompleted).toFixed(0) : 0;

        let topPlatform = 'N/A';
        let maxCount = 0;
        for (const [p, count] of Object.entries(platformCounts)) {
            if (count > maxCount) { maxCount = count; topPlatform = p; }
        }

        document.getElementById('stat-completed').innerText = totalCompleted;
        document.getElementById('stat-hours').innerText = totalHours.toLocaleString();
        document.getElementById('stat-avg').innerText = avgHours + 'h';
        document.getElementById('stat-genre').innerText = topPlatform;

        // 5. Render Table
        renderTable(allGames);

    } catch (e) {
        console.error("Error loading game log:", e);
    }
}

function renderTable(games) {
    const tbody = document.getElementById('game-table-body');
    tbody.innerHTML = '';

    if (games.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:grey;">No games found.</td></tr>';
        return;
    }

    games.forEach(game => {
        const statusClass = game.status === 'Completed' ? 'status-completed' : 'status-library';
        const hoursDisplay = game.hours > 0 ? `${game.hours}h` : '--';

        // Determine collection based on status for deletion
        const collection = game.status === 'Completed' ? 'completed_games' : 'backlog';

        const row = `
            <tr>
                <td>
                    <div class="game-title-cell">
                        <a href="gamepage.html?id=${game.id}" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 15px;">
                            <img src="${game.image || 'backlog.png'}" class="game-thumb">
                            ${game.title}
                        </a>
                    </div>
                </td>
                <td style="color:#ccc;">${game.platform}</td>
                <td><span class="status-badge ${statusClass}">${game.status}</span></td>
                <td style="text-align: right; font-weight:bold;">${hoursDisplay}</td>
                <td style="text-align: right;">
                    <button class="btn-delete" onclick="window.deleteGame('${game.firestoreId}', '${collection}')" title="Remove Game">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function filterGames() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const statusType = document.getElementById('filter-status').value;
    const sortType = document.getElementById('sort-by').value;

    let filtered = allGames.filter(g => {
        const matchesSearch = g.title.toLowerCase().includes(query);
        const matchesStatus = statusType === 'all'
            ? true
            : (statusType === 'completed' ? g.status === 'Completed' : g.status === 'In Library');
        return matchesSearch && matchesStatus;
    });

    if (sortType === 'hours') {
        filtered.sort((a, b) => b.hours - a.hours);
    }

    renderTable(filtered);
}

// Expose delete function to window so the onclick string works
window.deleteGame = async function (firestoreId, collectionName) {
    if (!confirm("Are you sure you want to remove this game from your log?")) {
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) return;

        await deleteDoc(doc(db, `users/${user.uid}/${collectionName}`, firestoreId));

        // Reload list
        loadGameLog(user.uid);
        // alert("Game removed.");

    } catch (err) {
        console.error("Error deleting game:", err);
        alert("Could not delete game.");
    }
}
