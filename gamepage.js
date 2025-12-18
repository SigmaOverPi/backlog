import { db, auth } from './firebase-config.js';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";


const apikey = '5621eb80dd714deb972a5821c4ddf73d';
let currentReviewRating = 0;
let currentGame = null;

//* Elements
const hero = document.getElementById('detail-hero');
const title = document.getElementById('detail-title');
const dev = document.getElementById('detail-dev');
const cover = document.getElementById('detail-cover');
const desc = document.getElementById('detail-desc');
const release = document.getElementById('detail-release');
const genre = document.getElementById('detail-genre');
const pub = document.getElementById('detail-pub');
const rating = document.getElementById('detail-rating');
const playtime = document.getElementById('detail-playtime');
const loading = document.getElementById('loading');
const content = document.getElementById('game-content');

//* Buttons
const addBtn = document.getElementById('btn-add');
//! Change selector back to .btn-secondary-full if error occurs
const markPlayedBtn = document.querySelector('.btn-mark-played');
const writeReviewBtn = document.querySelector('.btn-write-review');

//* Modal elements
const modalPlayed = document.getElementById('modal-played');
const modalReview = document.getElementById('modal-review');
const inputPlatform = document.getElementById('played-platform');
const inputHours = document.getElementById('played-hours');
const inputReviewText = document.getElementById('review-text');

//* On load, get ID from url
window.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('id');

    if (!gameId) {
        window.location.href = 'dashboard.html';
        return;
    }

    await loadGameDetails(gameId);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            checkIfAdded(gameId, user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    loadGameReviews(gameId); //* Load reviews
});

//* TAB LOGIC
const viewDetails = document.getElementById('view-details');
const viewReviews = document.getElementById('view-reviews');
const tabBtns = document.querySelectorAll('.tab-btn');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        //* Remove active from all
        tabBtns.forEach(b => b.classList.remove('active'));
        //* Add active to click
        btn.classList.add('active');

        const tab = btn.dataset.tab;
        if (tab === 'details') {
            viewDetails.classList.remove('hidden');
            viewReviews.classList.add('hidden');
        } else {
            viewDetails.classList.add('hidden');
            viewReviews.classList.remove('hidden');
        }
    });
});

//* Load Reviews
async function loadGameReviews(gameId) {
    const container = document.getElementById('reviews-container');
    try {
        const q = query(collection(db, 'reviews'), where('gameId', '==', parseInt(gameId)));
        const snapshot = await getDocs(q);

        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = '<p style="color: grey;">No reviews yet. Be the first!</p>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Recently';

            const card = `
                <div class="card-box" style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-weight: bold; color: white;">${data.user}</span>
                        <span style="color: gold;">${data.rating}/5 ★</span>
                    </div>
                    <p style="color: #ccc; font-size: 14px; margin-bottom: 10px;">${data.text}</p>
                    <div style="font-size: 12px; color: #666;">Posted on ${date}</div>
                </div>
            `;
            container.innerHTML += card;
        });

    } catch (error) {
        console.error('Error loading reviews:', error);
        container.innerHTML = '<p style="color: red;">Error loading reviews.</p>';
    }
}

//* Fetch data
async function loadGameDetails(id) {
    try {
        const res = await fetch(`https://api.rawg.io/api/games/${id}?key=${apikey}`);
        const data = await res.json();
        currentGame = data;
        renderDetails(data);
    } catch (err) {
        console.error(err);
        loading.innerText = 'Errror loading game';
    }
}

//* Render data
function renderDetails(game) {
    loading.classList.add('hidden');
    content.classList.remove('hidden');

    title.innerText = game.name;
    desc.innerHTML = game.description || 'No description';


    //* Images
    const bg = game.background_image_additional || game.background_image;
    hero.style.backgroundImage = `url('${bg}')`;
    cover.src = game.background_image;

    //* Meta
    dev.innerText = game.developers[0]?.name || 'Unknown';
    pub.innerText = game.publishers[0]?.name || 'Unknown';
    release.innerText = game.released;
    rating.innerText = `${game.rating} / 5`;
    playtime.innerText = `${game.playtime} Hours`;
    genre.innerText = game.genres.map(g => g.name).join(', ');
}

//* Add btn logic(adds to log)
addBtn.addEventListener('click', async () => {
    if (!currentGame) { return; }

    if (!auth.currentUser) {
        alert('Please login first');
        return;
    }

    try {
        const user = auth.currentUser;
        addBtn.innerText = 'Adding...';

        //* 1. Add to FIRESTORE Backlog
        await addDoc(collection(db, `users/${user.uid}/backlog`), {
            gameId: currentGame.id,
            gameName: currentGame.name,
            image: currentGame.background_image || '',
            genre: currentGame.genres && currentGame.genres.length > 0 ? currentGame.genres[0].name : 'Unknown',
            timestamp: serverTimestamp()
        });

        //* 2. Community Feed
        await addDoc(collection(db, 'community_activity'), {
            gameName: currentGame.name,
            gameId: currentGame.id, //* Added for navigation
            gameImage: currentGame.background_image || '',
            action: 'added to their log',
            user: user.displayName || 'A Gamer',
            timestamp: serverTimestamp()
        });

        //* 3. Personal Activity
        await addToUserActivity('Log', `Added ${currentGame.name} to backlog`);

        console.log('Activity broadcasted to community');

        //* UI Updates
        addBtn.innerText = 'In Library';
        addBtn.disabled = true;
        addBtn.style.backgroundColor = '#444';
        addBtn.style.color = '#888';
        addBtn.style.cursor = 'not-allowed';

        alert('Added to log!');

    } catch (e) {
        console.log('Error adding to log: ', e);
        addBtn.innerText = '+ Add to Log'; // Revert on error
    }
});

async function checkIfAdded(id, uid) {
    try {
        // Query Firestore instead of LocalStorage
        const q = query(collection(db, `users/${uid}/backlog`), where('gameId', '==', parseInt(id)));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            addBtn.innerText = 'In Library';
            addBtn.disabled = true;
            addBtn.style.backgroundColor = '#444';
            addBtn.style.color = '#888';
            addBtn.style.cursor = 'not-allowed';
        }
    } catch (err) {
        console.error("Error checking status:", err);
    }
}

//* Mark as played logic
//* new markPlayed button logic
markPlayedBtn.addEventListener('click', () => {
    if (!auth.currentUser) {
        alert('Please login to track games');
        return;
    }
    modalPlayed.classList.remove('hidden');
});

//* Cancel button logic
document.getElementById('btn-cancel-played').addEventListener('click', () => {
    modalPlayed.classList.add('hidden');
});

//* Confirm Save button logic
document.getElementById('btn-confirm-played').addEventListener('click', async () => {
    const platform = inputPlatform.value;
    const hours = inputHours.value;
    const user = auth.currentUser;

    if (!hours) {
        alert('Please enter hours played');
        return;
    }

    if (!user) {
        return;
    }

    try {
        document.getElementById('btn-confirm-played').innerText = 'Saving...';
        //* Save to user's 'completed games' collection (for dashboard table)
        await addDoc(collection(db, `users/${user.uid}/completed_games`), {
            gameId: currentGame.id,
            gameName: currentGame.name,
            platform: platform,
            hours: hours,
            dateCompleted: new Date().toLocaleDateString(),
            image: currentGame.background_image || '',
            genre: currentGame.genres && currentGame.genres.length > 0 ? currentGame.genres[0].name : 'Unknown'
        });

        //* Add to community feed
        await addDoc(collection(db, 'community_activity'), {
            type: 'status',
            gameName: currentGame.name,
            gameId: currentGame.id, //* Added for navigation
            gameImage: currentGame.background_image || '',
            action: `completed on ${platform}`,
            user: user.displayName || "A Gamer",
            timestamp: serverTimestamp() //* Uses server time
        });

        //* Add to activity tab (for dashboard)
        await addToUserActivity('Completion', `Finished ${currentGame.name} (${hours} hrs)`);

        //* Close modal and update UI
        modalPlayed.classList.add('hidden');
        markPlayedBtn.innerText = 'Completed ✓';
        markPlayedBtn.disabled = true;
        markPlayedBtn.style.backgroundColor = '#444';
        markPlayedBtn.style.color = '#888';
        markPlayedBtn.style.cursor = 'not-allowed';
        alert('Game saved as completed!');
    } catch (error) {
        console.log('Error saving status: ', error);
    }
});


//* Write Review logic
writeReviewBtn.addEventListener('click', () => {
    if (!auth.currentUser) {
        alert('Please login to review');
        return;
    }
    modalReview.classList.remove('hidden');
});

//* Star Selection logic
document.querySelectorAll('.star-in').forEach(star => {
    star.addEventListener('click', (e) => {
        currentReviewRating = e.target.dataset.value;

        //* Visual update
        document.querySelectorAll('.star-in').forEach(s => {
            if (s.dataset.value <= currentReviewRating) {
                s.classList.add('selected');
                s.style.color = 'gold';
            } else {
                s.classList.remove('selected');
                s.style.color = '#444';
            }
        });
    });
});

//* Cancel Review button logic
document.getElementById('btn-cancel-review').addEventListener('click', () => {
    modalReview.classList.add('hidden');
});

//* Post review logic
document.getElementById('btn-confirm-review').addEventListener('click', async () => {
    const text = inputReviewText.value;
    const user = auth.currentUser;

    if (!text || currentReviewRating === 0) {
        alert('Please select a star rating and write a review');
        return;
    }

    try {
        document.getElementById('btn-confirm-review').innerText = 'Posting...';
        //* Save review to global Review Collection
        const reviewRef = await addDoc(collection(db, 'reviews'), {
            gameId: currentGame.id,
            gameName: currentGame.name, //* Added for display
            user: user.displayName || 'Anonymous',
            userId: user.uid, //* Added for better querying
            rating: currentReviewRating,
            text: text,
            timestamp: serverTimestamp()
        });

        //* Add to personal activity (dashboard)
        await addToUserActivity('Review', `Reviewed ${currentGame.name}: ${currentReviewRating}/5 Stars`);

        await addDoc(collection(db, 'community_activity'), {
            type: 'review', //* Explicit type
            title: `Reviewed ${currentGame.name} (${currentReviewRating}/5)`,
            postId: reviewRef.id, //* Actual ID
            action: 'wrote a review',
            user: user.displayName || 'A Gamer',
            timestamp: serverTimestamp()
        });

        modalReview.classList.add('hidden');
        alert('Review Posted!');
    } catch (error) {
        console.error('Error posting review: ', error);
    }
});

//* Helper function to save to personal activity feed
async function addToUserActivity(type, message) {
    const user = auth.currentUser;
    if (!user) {
        return;
    }

    await addDoc(collection(db, `users/${user.uid}/recent_activity`), {
        type: type,
        message: message,
        timestamp: serverTimestamp(),
        gameImage: currentGame.background_image || ''
    });
}