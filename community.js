import { db, auth } from './firebase-config.js';
console.log("Database Object: ", db);
import { collection, addDoc, query, orderBy, limit, onSnapshot, getDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

//* Auth Check
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

//* Elements
const feedContainer = document.getElementById('feed-container');
const feedHeader = document.getElementById('feed-header');
const writeView = document.getElementById('write-post-view');
const readView = document.getElementById('read-post-view');

//* Form inputs
const postTitleInput = document.getElementById('post-title');
const postContentInput = document.getElementById('post-content');

//* Buttons
const btnCreate = document.getElementById('btn-create-post');
const btnSubmit = document.getElementById('btn-submit-post');
const btnCancel = document.getElementById('btn-cancel-post');
const btnBack = document.getElementById('btn-back-feed');

//* Navigation Logic
btnCreate.addEventListener('click', () => {
    feedContainer.classList.add('hidden');
    feedHeader.classList.add('hidden');
    writeView.classList.remove('hidden');
});


btnCancel.addEventListener('click', showFeed);
btnBack.addEventListener('click', showFeed);

function showFeed() {
    writeView.classList.add('hidden');
    readView.classList.add('hidden');
    feedContainer.classList.remove('hidden');
    feedHeader.classList.remove('hidden');
}

//* Submit forum post
btnSubmit.addEventListener('click', async () => {
    const title = postTitleInput.value;
    const content = postContentInput.value;

    if (!title || !content) {
        alert('Please fill out both fields');
        return;
    }

    btnSubmit.innerText = 'Posting...';

    try {
        //* Save the actual content to 'forum_posts' collection

        const user = auth.currentUser;
        const username = user ? user.displayName : 'A Gamer';
        const postRef = await addDoc(collection(db, "forum_posts"), {
            title: title,
            content: content,
            user: username,
            timestamp: serverTimestamp()
        });

        //* Add an entry to the 'community_activity' feed so it shows up in the list
        await addDoc(collection(db, 'community_activity'), {
            type: 'forum',
            title: title,
            postId: postRef.id,
            action: 'posted in the forum',
            user: username,
            timestamp: serverTimestamp()
        });

        //* Reset and go back
        postTitleInput.value = '';
        postContentInput.value = '';
        btnSubmit.innerText = 'Post to Forum';
        showFeed();
    } catch (e) {
        console.error('Error posting', e);
        btnSubmit.innerText = 'Error';
    }
});

//* Feed listener
const q = query(
    collection(db, 'community_activity'),
    orderBy('timestamp', 'desc'),
    limit(20)
);

onSnapshot(q, (snapshot) => {
    feedContainer.innerHTML = '';

    if (snapshot.empty) {
        feedContainer.innerHTML = '<p style="text-align: center;">No activity yet.</p>';
        return;
    }

    snapshot.forEach((doc) => {
        const data = doc.data();
        const card = createActivityCard(data);
        feedContainer.appendChild(card);
    });
});

//* Card generator
function createActivityCard(data) {
    const div = document.createElement('div');
    div.className = 'game-card activity-card';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.padding = '15px';
    div.style.marginBottom = '15px';
    div.style.cursor = 'default'; //* Default cursor, certain elements will be clickable

    const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Just now';

    //* Type 1 & 2 : Game Updates(Added or Completed)
    if (data.type === 'status' || !data.type) {
        if (data.gameId) {
            div.style.cursor = 'pointer'; //* Make it look clickable
        }
        div.innerHTML = `
        <img src="${data.gameImage || 'backlog.png'}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 4px; margin-right: 15px;">
        <div>
            <div style="font-size: 13px; color: #888;">${data.user} ${data.action}</div>
            <div style="font-size: 16px; font-weight: bold; color: white;">${data.gameName}</div>
            <div style="font-size: 12px; color: #555;">${date}</div>
        </div>
        `;

        //* Link to game page
        if (data.gameId) {
            div.addEventListener('click', () => {
                window.location.href = `gamepage.html?id=${data.gameId}`;
            });
        }
    }

    //* Type 3: Forum Post
    else if (data.type === 'forum') {
        div.style.cursor = 'pointer';
        div.innerHTML = `
        <div style="width: 60px; height: 60px; background: #222; border-radius: 4px; margin-right: 15px; display: flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="color: #888;">forum<span>
        </div>
        <div style="flex: 1;">
            <div style="font-size: 13px; color: #3b82f6;">${data.user} posted a discussion</div>
            <div style="font-size: 16px; font-weight: bold; color: white;">${data.title}</div>
            <div style="font-size: 12px; color: #555;">${date}</div>
        </div>
        <button style="background: #222; border: 1px; solid: #333; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px;">Read</button>
        `;

        //* Click event to read the full post
        div.addEventListener('click', () => openPost(data.postId, 'forum'));
    }

    //* Type 4: Review
    else if (data.type === 'review') {
        div.style.cursor = 'pointer';
        div.innerHTML = `
        <div style="width: 60px; height: 60px; background: #222; border-radius: 4px; margin-right: 15px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 24px;">⭐</span>
        </div>
        <div style="flex: 1;">
            <div style="font-size: 13px; color: gold;">${data.user} wrote a review</div>
            <div style="font-size: 16px; font-weight: bold; color: white;">${data.title}</div>
            <div style="font-size: 12px; color: #555;">${date}</div>
        </div>
        <button style="background: #222; border: 1px; solid: #333; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px;">Read</button>
        `;

        div.addEventListener('click', () => openPost(data.postId, 'review'));
    }

    return div;
}

//* Read post logic
async function openPost(postId, type) {
    //* Show loading UI
    feedContainer.classList.add('hidden');
    feedHeader.classList.add('hidden');
    readView.classList.remove('hidden');

    document.getElementById('read-title').innerText = 'Loading...';
    document.getElementById('read-body').innerText = '';

    try {
        let collectionName = 'forum_posts';
        if (type === 'review') {
            collectionName = 'reviews';
        }

        const docRef = doc(db, collectionName, postId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const post = docSnap.data();

            if (type === 'review') {
                //* Map review data
                document.getElementById('read-title').innerText = `Review: ${post.gameName}`;
                document.getElementById('read-user').innerText = post.user;
                document.getElementById('read-date').innerText = post.timestamp ? post.timestamp.toDate().toLocaleDateString() : 'Recently';
                document.getElementById('read-body').innerText = `Rating: ${post.rating}/5\n\n${post.text}`;
            } else {
                //* Map forum data
                document.getElementById('read-title').innerText = post.title;
                document.getElementById('read-user').innerText = post.user;
                document.getElementById('read-date').innerText = post.timestamp ? post.timestamp.toDate().toLocaleDateString() : 'Recently';
                document.getElementById('read-body').innerText = post.content;
            }

        } else {
            document.getElementById('read-body').innerText = 'Post not found (it may have been deleted)';
        }
    } catch (e) {
        console.error('Error fetching post: ', e);
        document.getElementById('read-body').innerText = 'Error loading content';
    }
}