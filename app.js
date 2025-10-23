// State
let followersData = null;
let followingData = null;

// DOM Elements
const followersFile = document.getElementById('followersFile');
const followingFile = document.getElementById('followingFile');
const followersFileName = document.getElementById('followersFileName');
const followingFileName = document.getElementById('followingFileName');
const followersUpload = document.getElementById('followersUpload');
const followingUpload = document.getElementById('followingUpload');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('results');

// Event Listeners
followersFile.addEventListener('change', (e) => handleFileUpload(e, 'followers'));
followingFile.addEventListener('change', (e) => handleFileUpload(e, 'following'));
analyzeBtn.addEventListener('click', analyzeData);

// Handle file upload
function handleFileUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (type === 'followers') {
                console.log(`Parsing followers from ${file.name}`);
                followersData = parseInstagramData(data);
                followersFileName.textContent = file.name;
                followersUpload.classList.add('has-file');
            } else {
                console.log(`Parsing following from ${file.name}`);
                followingData = parseInstagramData(data);
                followingFileName.textContent = file.name;
                followingUpload.classList.add('has-file');
            }

            // Enable analyze button if both files are uploaded
            if (followersData && followingData) {
                analyzeBtn.disabled = false;
            }
        } catch (error) {
            alert(`Error parsing ${type} file: ${error.message}`);
        }
    };
    reader.readAsText(file);
}

// Parse Instagram JSON data (handles multiple formats)
function parseInstagramData(data) {
    const usernames = new Set();

    // Determine if we have a wrapper object or direct array
    let items = data;
    if (data.relationships_following) {
        items = data.relationships_following;
    } else if (data.relationships_followers) {
        items = data.relationships_followers;
    }

    // Process array of items
    if (Array.isArray(items)) {
        items.forEach(item => {
            // Instagram format: username can be in 'title' field (following.json)
            if (item.title && item.title.trim() !== '') {
                usernames.add(item.title.toLowerCase());
            }
            // Or in string_list_data[].value (followers.json)
            else if (item.string_list_data && Array.isArray(item.string_list_data)) {
                item.string_list_data.forEach(user => {
                    if (user.value) {
                        usernames.add(user.value.toLowerCase());
                    }
                });
            }
        });
    }

    console.log(`Parsed ${usernames.size} unique usernames`);
    return usernames;
}

// Analyze the data
function analyzeData() {
    if (!followersData || !followingData) {
        alert('Please upload both files first');
        return;
    }

    console.log('Followers:', followersData.size);
    console.log('Following:', followingData.size);

    // Find users you follow who don't follow you back
    const notFollowingBack = [...followingData].filter(user => !followersData.has(user));

    // Find users who follow you that you don't follow back
    const notFollowedBack = [...followersData].filter(user => !followingData.has(user));

    console.log('Not following you back:', notFollowingBack.length);
    console.log('You not following back:', notFollowedBack.length);

    // Display results
    displayResults(notFollowingBack, notFollowedBack);

    // Show results section
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Display results
function displayResults(notFollowingBack, notFollowedBack) {
    const notFollowingBackList = document.getElementById('notFollowingBackList');
    const notFollowedBackList = document.getElementById('notFollowedBackList');
    const notFollowingBackCount = document.getElementById('notFollowingBackCount');
    const notFollowedBackCount = document.getElementById('notFollowedBackCount');

    // Update counts
    notFollowingBackCount.textContent = notFollowingBack.length;
    notFollowedBackCount.textContent = notFollowedBack.length;

    // Display "Not Following Back" list
    notFollowingBackList.innerHTML = '';
    if (notFollowingBack.length === 0) {
        notFollowingBackList.innerHTML = '<p style="color: #a8a8a8; text-align: center; padding: 20px;">Everyone you follow follows you back! 🎉</p>';
    } else {
        notFollowingBack.sort().forEach(username => {
            notFollowingBackList.appendChild(createUserItem(username));
        });
    }

    // Display "Not Followed Back" list
    notFollowedBackList.innerHTML = '';
    if (notFollowedBack.length === 0) {
        notFollowedBackList.innerHTML = '<p style="color: #a8a8a8; text-align: center; padding: 20px;">You follow everyone back! ✨</p>';
    } else {
        notFollowedBack.sort().forEach(username => {
            notFollowedBackList.appendChild(createUserItem(username));
        });
    }
}

// Create user item element
function createUserItem(username) {
    const div = document.createElement('div');
    div.className = 'user-item';

    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    avatar.textContent = username.charAt(0).toUpperCase();

    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';

    const usernameDiv = document.createElement('div');
    usernameDiv.className = 'username';
    usernameDiv.textContent = username;

    const link = document.createElement('a');
    link.className = 'profile-link';
    link.href = `https://www.instagram.com/${username}`;
    link.target = '_blank';
    link.textContent = 'View Profile';

    userInfo.appendChild(usernameDiv);
    userInfo.appendChild(link);

    div.appendChild(avatar);
    div.appendChild(userInfo);

    return div;
}
