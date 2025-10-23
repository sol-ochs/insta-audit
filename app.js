// Configuration
const DEBUG_MODE = false; // Set to true for development logging
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
const ERROR_DISMISS_TIME = 5000; // 5 seconds
const ERROR_FADE_TIME = 300; // 300ms

// Constants for file types
const FILE_TYPE = {
    FOLLOWERS: 'followers',
    FOLLOWING: 'following'
};

// Helper for debug logging
const debug = {
    log: (...args) => DEBUG_MODE && console.log(...args),
    warn: (...args) => DEBUG_MODE && console.warn(...args),
    error: (...args) => console.error(...args) // Always show errors
};

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
followersFile.addEventListener('change', (e) => handleFileUpload(e, FILE_TYPE.FOLLOWERS));
followingFile.addEventListener('change', (e) => handleFileUpload(e, FILE_TYPE.FOLLOWING));
analyzeBtn.addEventListener('click', analyzeData);

// Handle file upload
function handleFileUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
        showError(`Please upload a JSON file for ${type}. Selected file: ${file.name}`);
        event.target.value = ''; // Reset file input
        return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        showError(`File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        event.target.value = '';
        return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
        showError(`Failed to read ${type} file. Please try again.`);
        event.target.value = '';
    };

    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (type === FILE_TYPE.FOLLOWERS) {
                debug.log(`Parsing followers from ${file.name}`);
                followersData = parseInstagramData(data, type);

                if (followersData.size === 0) {
                    showError(`No valid follower data found in ${file.name}. Please check that you uploaded the correct followers file from Instagram.`);
                    followersData = null;
                    event.target.value = '';
                    return;
                }

                followersFileName.textContent = file.name;
                followersUpload.classList.add('has-file');
            } else if (type === FILE_TYPE.FOLLOWING) {
                debug.log(`Parsing following from ${file.name}`);
                followingData = parseInstagramData(data, type);

                if (followingData.size === 0) {
                    showError(`No valid following data found in ${file.name}. Please check that you uploaded the correct following file from Instagram.`);
                    followingData = null;
                    event.target.value = '';
                    return;
                }

                followingFileName.textContent = file.name;
                followingUpload.classList.add('has-file');
            }

            // Enable analyze button if both files are uploaded
            if (followersData && followingData) {
                analyzeBtn.disabled = false;
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                showError(`Invalid JSON file for ${type}. Please make sure you uploaded a valid Instagram data export file.`);
            } else {
                showError(`Error processing ${type} file: ${error.message}`);
            }
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

// Show error message to user
function showError(message) {
    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    // Insert after header
    const header = document.querySelector('header');
    const existingError = document.querySelector('.error-message');

    if (existingError) {
        existingError.remove();
    }

    header.after(errorDiv);

    // Auto-dismiss after configured time
    setTimeout(() => {
        errorDiv.classList.add('fade-out');
        setTimeout(() => errorDiv.remove(), ERROR_FADE_TIME);
    }, ERROR_DISMISS_TIME);
}

/**
 * Parse Instagram JSON data export files and extract usernames
 *
 * Instagram export files come in two different formats:
 *
 * 1. following.json format:
 *    { relationships_following: [
 *        { title: "username", ... },
 *        { title: "another_user", ... }
 *    ]}
 *
 * 2. followers_1.json format:
 *    { relationships_followers: [
 *        { string_list_data: [{ value: "username", ... }], ... },
 *        { string_list_data: [{ value: "another_user", ... }], ... }
 *    ]}
 *
 * This function handles both formats and normalizes them into a Set of lowercase usernames
 *
 * @param {Object} data - The parsed JSON data from Instagram export
 * @param {string} type - Either FILE_TYPE.FOLLOWERS or FILE_TYPE.FOLLOWING
 * @returns {Set<string>} Set of lowercase usernames
 * @throws {Error} If data format is invalid or incompatible
 */
function parseInstagramData(data, type) {
    const usernames = new Set();

    // Validate input
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format. Expected a JSON object.');
    }

    // Determine if we have a wrapper object or direct array
    // Instagram wraps the data in either 'relationships_following' or 'relationships_followers'
    let items = data;
    if (data.relationships_following) {
        items = data.relationships_following;
    } else if (data.relationships_followers) {
        items = data.relationships_followers;
    }

    // Validate array format
    if (!Array.isArray(items)) {
        throw new Error(`Expected an array of ${type} but received ${typeof items}. Please check that you uploaded the correct Instagram export file.`);
    }

    // Process array of items
    // Each item can have username in different fields depending on the export format
    items.forEach((item, index) => {
        try {
            // Format 1: Username in 'title' field (following.json)
            // Example: { title: "username", href: "...", ... }
            if (item.title && item.title.trim() !== '') {
                usernames.add(item.title.toLowerCase());
            }
            // Format 2: Username in string_list_data[].value (followers.json)
            // Example: { string_list_data: [{ value: "username", ... }], ... }
            else if (item.string_list_data && Array.isArray(item.string_list_data)) {
                item.string_list_data.forEach(user => {
                    if (user.value && typeof user.value === 'string') {
                        usernames.add(user.value.toLowerCase());
                    }
                });
            }
            // If neither format is found, the item is silently skipped
        } catch (itemError) {
            // Log but don't fail on individual malformed items
            debug.warn(`Skipping invalid item at index ${index}:`, itemError);
        }
    });

    debug.log(`Parsed ${usernames.size} unique usernames`);
    return usernames;
}

// Analyze the data
function analyzeData() {
    if (!followersData || !followingData) {
        showError('Please upload both files first');
        return;
    }

    debug.log('Followers:', followersData.size);
    debug.log('Following:', followingData.size);

    // Find users you follow who don't follow you back
    const notFollowingBack = [...followingData].filter(user => !followersData.has(user));

    // Find users who follow you that you don't follow back
    const notFollowedBack = [...followersData].filter(user => !followingData.has(user));

    debug.log('Not following you back:', notFollowingBack.length);
    debug.log('You not following back:', notFollowedBack.length);

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
        notFollowingBackList.innerHTML = '<p class="empty-state">Everyone you follow follows you back! 🎉</p>';
    } else {
        notFollowingBack.sort().forEach(username => {
            notFollowingBackList.appendChild(createUserItem(username));
        });
    }

    // Display "Not Followed Back" list
    notFollowedBackList.innerHTML = '';
    if (notFollowedBack.length === 0) {
        notFollowedBackList.innerHTML = '<p class="empty-state">You follow everyone back! ✨</p>';
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
