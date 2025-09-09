// js/common.js

// --- Constants ---
const GOOGLE_CLIENT_ID = '181314531748-nalf8lp7tpghuimjb6h9t5avujbau3bd.apps.googleusercontent.com';
const API_URL = "https://snazzy-stroopwafel-4cf3a5.netlify.app/.netlify/functions/proxy";
const DEFAULT_NAME_OPTION = "Select Your Name";
const DEFAULT_CLASS_OPTION = "Select Class";
const LOADING_OPTION = "Loading...";
const NO_EMOJI_OPTION = "No Emoji";
const STATUS_PASS_AVAILABLE = "PASS IS AVAILABLE";
const STATUS_IS_OUT = "IS OUT";
const STATUS_IS_NEXT = "IS NEXT";
const ACTION_LOG_SIGN_IN = 'logSignIn';
const ACTION_LOG_LATE_SIGN_IN = 'logLateSignIn';
const ACTION_LOG_TRAVEL_SIGN_OUT = 'logTravelSignOut'; 
const ACTION_LOG_TRAVEL_SIGN_IN = 'logTravelSignIn';
const ACTION_GET_ALL_DATA = 'getAllData';
const ACTION_GET_REPORT_DATA = 'getReportData';
const TARDY_THRESHOLD_MINUTES = 5;
const EMOJI_LIST = ['🚽', '🚿', '🛁', '🧻', '🧼', '🧴', '💦', '💧', '🏃‍♂️', '💨', '🤫', '🚶‍♀️', '😅', '✨', '🚻', '🚾'];
const FORM_COLOR_AVAILABLE = "#4ade80"; // Green
const FORM_COLOR_OUT = "#f6b26b"; // Orange
const FORM_COLOR_TARDY = "#ef4444"; // Red
const LATE_SIGN_IN_BUTTON_DEFAULT_TEXT = "Sign In Late";
const SIGN_IN_BUTTON_DEFAULT_TEXT = "Sign In";
const ACTION_REFRESH_TOKEN = 'refreshToken';
const infoBarTeacher = document.getElementById('infoBarTeacher');

let googleLibraryLoaded = false;

// --- START: FIX for Race Condition ---
// This promise will resolve only when the DOM is fully loaded and elements are cached.
let domReadyResolve;
const domReadyPromise = new Promise(resolve => {
    domReadyResolve = resolve;
});
// --- END: FIX ---

// --- Global State Management ---
const appState = {
    currentUser: { email: '', name: '', profilePic: '', idToken: '' },
    timer: { seconds: 0, minutes: 0, intervalId: null, isTardy: false },
    passHolder: null,
    queue: [],
    selectedQueueName: null,
    data: { allNamesFromSheet: [], courses: [], namesForSelectedCourse: [], allSignOuts: [] },
    ui: { 
        currentRightView: 'lateSignIn',
        currentDashboardTab: 'signOut',
        pollingIntervalId: null,
        tokenRefreshIntervalId: null,
        isDataLoaded: false, 
        isPassEnabled: true,
        currentClassPeriod: null,
        lastPageRefresh: null,
        lastPoll: null,
        isProfileMenuSetup: false
    },
    sortState: {
        signOut: { column: 'Date', direction: 'desc' },
        classTrends: { column: 'TimeOut', direction: 'desc' }
    }
};

// --- Common DOM Element References ---
let signInPage, loadingOverlay, googleSignInButton, signInError, appContent, bodyElement;
let profileMenuContainer, profilePicture, profileDropdown, dropdownUserName, dropdownUserEmail, dropdownSignOutButton;
let alertDiv, alertMessageSpan, errorAlertDiv, errorAlertMessageSpan;

/**
 * Caches common DOM elements by their IDs.
 */
function cacheCommonDOMElements() {
    signInPage = document.getElementById('signInPage');
    loadingOverlay = document.getElementById('loadingOverlay');
    googleSignInButton = document.getElementById('googleSignInButton');
    signInError = document.getElementById('signInError');
    appContent = document.getElementById('appContent');
    bodyElement = document.getElementById('body');
    profileMenuContainer = document.getElementById('profileMenuContainer');
    profilePicture = document.getElementById('profilePicture');
    profileDropdown = document.getElementById('profileDropdown');
    dropdownUserName = document.getElementById('dropdownUserName');
    dropdownUserEmail = document.getElementById('dropdownUserEmail');
    dropdownSignOutButton = document.getElementById('dropdownSignOutButton');
    alertDiv = document.getElementById('alertDiv');
    alertMessageSpan = document.getElementById('alertMessage');
    errorAlertDiv = document.getElementById('errorAlertDiv');
    errorAlertMessageSpan = document.getElementById('errorAlertMessage');
}


// --- Utility Functions ---

function normalizeName(name) {
    if (typeof name !== 'string') return '';
    const idx = name.indexOf('(');
    return idx > -1 ? name.substring(0, idx).trim() : name.trim();
}

function decodeJwtResponse(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function showSuccessAlert(message) {
    if (alertDiv && alertMessageSpan) {
        alertDiv.classList.remove("hidden", "bg-red-100", "border-red-400", "text-red-700");
        alertDiv.classList.add("bg-green-100", "border-green-400", "text-green-700");
        alertMessageSpan.textContent = message;
        setTimeout(() => alertDiv.classList.add('hidden'), 5000);
    } else {
        console.warn("Success alert elements not found.");
    }
}

function showErrorAlert(message) {
    if (errorAlertDiv && errorAlertMessageSpan) {
        errorAlertDiv.classList.remove("hidden", "bg-green-100", "border-green-400", "text-green-700");
        errorAlertDiv.classList.add("bg-red-100", "border-red-400", "text-red-700");
        errorAlertMessageSpan.textContent = message;
        setTimeout(() => errorAlertDiv.classList.add('hidden'), 10000);
    } else {
        console.warn("Error alert elements not found.");
    }
}

function removeOptions(selectElement) {
    while (selectElement.options.length > 0) {
        selectElement.remove(0);
    }
}

function setupProfileMenu() {
    if (appState.ui.isProfileMenuSetup) {
        return;
    }

    if (profilePicture && dropdownSignOutButton && profileDropdown && bodyElement) {
        profilePicture.addEventListener('click', (event) => {
            event.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        });

        dropdownSignOutButton.addEventListener('click', handleGoogleSignOut);

        bodyElement.addEventListener('click', (event) => {
            if (!profileMenuContainer.contains(event.target) && !profileDropdown.classList.contains('hidden')) {
                profileDropdown.classList.add('hidden');
            }
        });

        appState.ui.isProfileMenuSetup = true;
    }
}

function populateDropdown(dropdownId, arr, defaultText, defaultValue = "") {
    let selectElement = document.getElementById(dropdownId);
    if (!selectElement) {
        console.warn(`Dropdown with ID ${dropdownId} not found.`);
        return;
    }
    removeOptions(selectElement); 

    const defaultOptionElement = new Option(defaultText, defaultValue);
    selectElement.add(defaultOptionElement);

    arr.forEach(itemValue => {
        if (itemValue !== defaultText && itemValue !== defaultValue) { 
            selectElement.add(new Option(itemValue, itemValue));
        }
    });
    selectElement.value = defaultValue;
}

async function sendAuthenticatedRequest(payload, isRetry = false) {
    if (!appState.currentUser.idToken) {
        throw new Error("User not authenticated. Missing ID token.");
    }

    payload.userEmail = appState.currentUser.email;
    payload.idToken = appState.currentUser.idToken;

    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY = 1000;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error === "SESSION_EXPIRED") {
                        throw new Error("SESSION_EXPIRED");
                    }
                    throw new Error(errorJson.error || `Server returned an error: ${errorText}`);
                } catch (e) {
                    if (e.message === "SESSION_EXPIRED") throw e;
                    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
                }
            }
            return await response.json();

        } catch (error) {
            if (error.message === "SESSION_EXPIRED") {
                if (isRetry) throw error;
                break;
            }

            console.warn(`Request attempt ${attempt} failed: ${error.message}`);
            if (attempt === MAX_ATTEMPTS) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }

    try {
        console.warn("Session expired. Attempting silent refresh...");
        const refreshPayload = { action: ACTION_REFRESH_TOKEN, userEmail: appState.currentUser.email };
        
        const refreshResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(refreshPayload)
        }).then(res => res.json());

        if (refreshResponse.result === 'success' && refreshResponse.idToken) {
            console.log("Token successfully refreshed. Retrying original request.");
            appState.currentUser.idToken = refreshResponse.idToken;
            return await sendAuthenticatedRequest(payload, true);
        } else {
            const failureReason = refreshResponse.details || 'unknown_error';
            console.error(`Silent refresh failed. Reason: ${failureReason}. Triggering a page reload.`);
            
            showErrorAlert(`Your session has expired. The application will now refresh to reconnect.`);
            
            setTimeout(() => {
                window.location.reload();
            }, 3000);
            
            throw new Error(`Session expired (${failureReason}). Refreshing page.`);
        }
    } catch (e) {
        console.error("A critical error occurred during the refresh attempt:", e);
        throw new Error("Your session has expired. Please sign in again.");
    }
}

async function fetchAllStudentData() {
    try {
        const data = await sendAuthenticatedRequest({ action: ACTION_GET_ALL_DATA });
        if (data && Array.isArray(data)) {
            const cleanedData = data.map(item => (typeof item === 'string' ? item.trim() : item));
            appState.data.allNamesFromSheet = data;
        } else {
            console.error('Error: fetchAllStudentData received non-array data:', data);
            appState.data.allNamesFromSheet = [];
            showErrorAlert("Failed to load student data. Server returned unexpected format.");
            throw new Error("Invalid data format from server.");
        }
    } catch (error) {
        console.error('Error fetching all student data:', error);
        appState.data.allNamesFromSheet = [];
        showErrorAlert("Failed to load student data. Please check connection and refresh.");
        throw error;
    }
}

function populateCourseDropdownFromData() {
    if (appState.data.allNamesFromSheet.length > 0) {
        const uniqueClassNames = new Set();
        appState.data.allNamesFromSheet.forEach(item => {
            if (item && item.Class) {
                uniqueClassNames.add(item.Class);
            }
        });
        appState.data.courses = Array.from(uniqueClassNames).sort(); 
    } else {
        appState.data.courses = [];
    }
}


// --- Google Sign-In Initialization & Handlers ---

/**
 * MODIFIED: Now waits for the DOM to be ready before updating the UI.
 */
async function handleSignIn(authCode) {
    try {
        const payload = {
            action: 'exchangeCodeForTokens',
            code: authCode
        };

        const tokenData = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(res => res.json());

        if (tokenData.result === 'success' && tokenData.idToken) {
            const profile = decodeJwtResponse(tokenData.idToken);
            
            localStorage.setItem('lastUserEmail', profile.email);

            appState.currentUser.email = profile.email;
            appState.currentUser.name = profile.name;
            appState.currentUser.profilePic = profile.picture;
            appState.currentUser.idToken = tokenData.idToken;

            console.log("User signed in. Waiting for DOM to be ready...");
            await domReadyPromise; // Wait for DOM caching to complete
            console.log("DOM is ready. Updating UI.");
            updateUIAfterSignIn();

        } else {
            throw new Error(tokenData.error || "Failed to exchange authorization code.");
        } 
    } catch (error) {
        console.error("Authorization code exchange failed:", error);
        showErrorAlert("Could not complete the sign-in process. Please try again.");
    } finally {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
}

function initGoogleSignIn() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
        console.error("Google Identity Services library not loaded.");
        if(signInError) showErrorAlert("Google Sign-In library failed to load.");
        return;
    }

    const codeClient = google.accounts.oauth2.initCodeClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        ux_mode: 'popup',
        access_type: 'offline',
        callback: (response) => {
            if (response.code) {
                handleSignIn(response.code);
            }
        },
    });

    if (googleSignInButton) {
        googleSignInButton.innerHTML = '';
        const customButton = document.createElement('button');
        customButton.textContent = 'Sign in with Google';
        customButton.className = 'bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors';
        customButton.onclick = () => {
            if (loadingOverlay) loadingOverlay.classList.remove('hidden');
            codeClient.requestCode();
        };
        googleSignInButton.appendChild(customButton);
    }
}

function handleGoogleSignOut() {
    localStorage.removeItem('lastUserEmail');

    if (appState.ui.tokenRefreshIntervalId) clearInterval(appState.ui.tokenRefreshIntervalId);

    console.log('User signed out.');
    
    appState.currentUser = { email: '', name: '', profilePic: '', idToken: '' };

    if (appContent) appContent.classList.add('hidden');
    if (signInPage) {
        signInPage.classList.remove('hidden');
        signInPage.style.display = 'flex';
    }
    if (bodyElement) bodyElement.classList.add('justify-center');
    if (profileMenuContainer) profileMenuContainer.classList.add('hidden');
    if (profileDropdown) profileDropdown.classList.add('hidden');

    if (typeof resetPageSpecificAppState === 'function') {
        resetPageSpecificAppState();
    }
}

async function proactiveTokenRefresh() {
    console.log("Proactively refreshing session token...");
    if (!appState.currentUser.email) {
        console.warn("Cannot refresh token; no user is signed in.");
        return;
    }

    try {
        const refreshPayload = {
            action: ACTION_REFRESH_TOKEN,
            userEmail: appState.currentUser.email
        };
        const tokenData = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(refreshPayload)
        }).then(res => res.json());

        if (tokenData.result === 'success' && tokenData.idToken) {
            console.log("Proactive token refresh successful.");
            appState.currentUser.idToken = tokenData.idToken;
        } else {
            throw new Error(tokenData.details || "Backend rejected the proactive refresh.");
        }
    } catch (error) {
        console.error("Proactive token refresh failed:", error.message);
    }
}

/**
 * MODIFIED: Now waits for the DOM to be ready before updating the UI.
 */
async function attemptSilentSignIn() {
    const lastUserEmail = localStorage.getItem('lastUserEmail');
    if (!lastUserEmail) {
        return false;
    }

    console.log(`Found stored user: ${lastUserEmail}. Attempting silent sign-in...`);
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    try {
        const refreshPayload = {
            action: ACTION_REFRESH_TOKEN,
            userEmail: lastUserEmail
        };
        const tokenData = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(refreshPayload)
        }).then(res => res.json());

        if (tokenData.result === 'success' && tokenData.idToken) {
            console.log("Silent sign-in successful.");
            const profile = decodeJwtResponse(tokenData.idToken);

            appState.currentUser.email = profile.email;
            appState.currentUser.name = profile.name;
            appState.currentUser.profilePic = profile.picture;
            appState.currentUser.idToken = tokenData.idToken;

            console.log("User data loaded. Waiting for DOM to be ready...");
            await domReadyPromise; // Wait for DOM caching to complete
            console.log("DOM is ready. Updating UI.");
            updateUIAfterSignIn();

            return true;
        } else {
            throw new Error(tokenData.details || "Refresh token was rejected.");
        }
    } catch (error) {
        console.warn("Silent sign-in failed:", error.message);
        localStorage.removeItem('lastUserEmail');
        return false;
    } finally {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
}

function updateUIAfterSignIn() {
    console.log("User data to display:", appState.currentUser);

    if (profilePicture) profilePicture.src = appState.currentUser.profilePic;
    if (dropdownUserName) dropdownUserName.textContent = appState.currentUser.name;
    if (dropdownUserEmail) dropdownUserEmail.textContent = appState.currentUser.email;
    const infoBarTeacherEl = document.getElementById('infoBarTeacher'); // Re-check element
    if (infoBarTeacherEl) infoBarTeacherEl.textContent = `Teacher: ${appState.currentUser.name}`;

    if (signInPage) signInPage.style.display = 'none';

    if (appContent) {
        appContent.classList.remove('hidden');
        appContent.style.display = 'flex';
    }

    if (bodyElement) bodyElement.classList.remove('justify-center');
    if (profileMenuContainer) profileMenuContainer.classList.remove('hidden');
    setupProfileMenu();

    if (appState.ui.tokenRefreshIntervalId) clearInterval(appState.ui.tokenRefreshIntervalId);
    proactiveTokenRefresh();
    appState.ui.tokenRefreshIntervalId = setInterval(proactiveTokenRefresh, 45 * 60 * 1000);

    if (typeof initializePageSpecificApp === 'function') {
        initializePageSpecificApp();
    }
}

async function onGoogleLibraryLoad() {
    if (googleLibraryLoaded) {
        console.warn("onGoogleLibraryLoad called more than once. Ignoring.");
        return;
    }
    googleLibraryLoaded = true;

    const silentSignInSuccess = await attemptSilentSignIn();

    if (!silentSignInSuccess) {
        await domReadyPromise; // Wait for DOM before initializing button
        initGoogleSignIn();
    }
}

// --- Main App Initialization Flow ---
document.addEventListener('DOMContentLoaded', () => {
    cacheCommonDOMElements();
    domReadyResolve(); // Signal that DOM is ready and elements are cached
});