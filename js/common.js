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
const ACTION_GET_REPORT_DATA = 'getReportData'; // Added for dashboard
const TARDY_THRESHOLD_MINUTES = 5;
const EMOJI_LIST = ['🚽', '🚿', '🛁', '🧻', '🧼', '🧴', '💦', '💧', '🏃‍♂️', '💨', '🤫', '🚶‍♀️', '😅', '✨', '🚻', '🚾'];
const FORM_COLOR_AVAILABLE = "#4ade80"; // Green
const FORM_COLOR_OUT = "#f6b26b"; // Orange
const FORM_COLOR_TARDY = "#ef4444"; // Red
const LATE_SIGN_IN_BUTTON_DEFAULT_TEXT = "Sign In Late";
const SIGN_IN_BUTTON_DEFAULT_TEXT = "Sign In";
const ACTION_REFRESH_TOKEN = 'refreshToken';
const infoBarTeacher = document.getElementById('infoBarTeacher');



// --- Global State Management ---
// This object will hold the shared application state.
// Other script files can access properties of appState.
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
        isDataLoaded: false, 
        isPassEnabled: true,
        currentClassPeriod: null,
        lastPageRefresh: null, // Add this
        lastPoll: null         // Add this

    },
    sortState: {
        signOut: { column: 'Date', direction: 'desc' },
        classTrends: { column: 'TimeOut', direction: 'desc' }
    }
};

// --- Common DOM Element References (Declared, then assigned in cacheCommonDOMElements) ---
// These are declared as 'let' so they can be assigned after DOMContentLoaded.
let signInPage;
let loadingOverlay;
let googleSignInButton;
let signInError;
let appContent;
let bodyElement;
let profileMenuContainer;
let profilePicture;
let profileDropdown;
let dropdownUserName;
let dropdownUserEmail;
let dropdownSignOutButton;
let alertDiv;
let alertMessageSpan;
let errorAlertDiv;
let errorAlertMessageSpan;

/**
 * Caches common DOM elements by their IDs.
 * This should be called only after DOMContentLoaded to ensure elements are available.
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

/**
 * Normalizes a student name by removing any parenthetical additions (e.g., "(30)").
 * @param {string} name - The full name string.
 * @returns {string} The normalized base name.
 */
function normalizeName(name) {
    if (typeof name !== 'string') return '';
    const idx = name.indexOf('(');
    return idx > -1 ? name.substring(0, idx).trim() : name.trim();
}


/**
 * Decodes a JWT (JSON Web Token) to extract its payload.
 * Used for decoding Google's ID Tokens.
 * @param {string} token - The JWT string.
 * @returns {object} The decoded JWT payload.
 */
function decodeJwtResponse(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

/**
 * Shows a success alert message.
 * @param {string} message - The message to display.
 */
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

/**
 * Shows an error alert message.
 * @param {string} message - The message to display.
 */
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

/**
 * Removes all options from a select element.
 * @param {HTMLSelectElement} selectElement - The select element to clear.
 */
function removeOptions(selectElement) {
    while (selectElement.options.length > 0) {
        selectElement.remove(0);
    }
}

/**
 * NEW: Attaches event listeners to the profile menu dropdown.
 * This is separated so it can be called by both manual and silent sign-in flows.
 */
function setupProfileMenu() {
    if (profilePicture && dropdownSignOutButton && profileMenuContainer && profileDropdown && bodyElement) {
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
    }
}


/**
 * Populates a dropdown (select) element with options.
 * @param {string} dropdownId - The ID of the select element.
 * @param {Array<string>} arr - An array of strings to populate the dropdown.
 * @param {string} defaultText - The text for the default (first) option.
 * @param {string} [defaultValue=""] - The value for the default (first) option.
 */
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
        // Ensure default texts aren't added as selectable options from data
        if (itemValue !== defaultText && itemValue !== defaultValue) { 
            selectElement.add(new Option(itemValue, itemValue));
        }
    });
    selectElement.value = defaultValue; // Set the default option as selected
}

/**
 * MODIFIED: Makes an authenticated POST request with more robust error handling
 * and a retry mechanism to handle "wake from sleep" network issues.
 */
async function sendAuthenticatedRequest(payload, isRetry = false) {
    if (!appState.currentUser.idToken) {
        throw new Error("User not authenticated. Missing ID token.");
    }

    payload.userEmail = appState.currentUser.email;
    payload.idToken = appState.currentUser.idToken;

    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY = 1000; // 1 second

    // --- NEW: Retry Loop ---
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
            // If the fetch was successful, return the JSON and exit the loop.
            return await response.json();

        } catch (error) {
            // This catch block now handles both network errors and thrown session errors.

            // If it's a session error, proceed to the refresh logic immediately.
            if (error.message === "SESSION_EXPIRED") {
                if (isRetry) throw error; // Prevent infinite refresh loops.
                // Break the retry loop and let the outer refresh logic handle it.
                break;
            }

            // If it's another type of error (likely a network failure)...
            console.warn(`Request attempt ${attempt} failed: ${error.message}`);
            if (attempt === MAX_ATTEMPTS) {
                // If this was the last attempt, throw the error to be handled by the caller.
                throw error;
            }
            // Wait for a moment before the next attempt.
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
    // --- End Retry Loop ---

    // This section is now only reached if the retry loop breaks due to "SESSION_EXPIRED".
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
            // --- THIS IS THE IMPLEMENTATION OF YOUR SOLUTION ---
            const failureReason = refreshResponse.details || 'unknown_error';
            console.error(`Silent refresh failed. Reason: ${failureReason}. Triggering a page reload.`);
            
            // Inform the user, then reload the page to get a fresh session.
            showErrorAlert(`Your session has expired. The application will now refresh to reconnect.`);
            
            // Wait a few seconds for the user to see the message before reloading.
            setTimeout(() => {
                window.location.reload();
            }, 3000);
            
            // Throw an error to stop the current, failed operation.
            throw new Error(`Session expired (${failureReason}). Refreshing page.`);
            // --- END OF FIX ---
        }
    } catch (e) {
        // This will catch the error we just threw and any other critical errors.
        console.error("A critical error occurred during the refresh attempt:", e);
        // We no longer call handleGoogleSignOut() here, as the page reload will manage the state.
        throw new Error("Your session has expired. Please sign in again.");
    }
}

/**
 * Fetches all student data for the current teacher from the backend.
 * This is a common utility for both Bathroom Pass and Teacher Dashboard.
 */
async function fetchAllStudentData() {
    try {
        const data = await sendAuthenticatedRequest({ action: ACTION_GET_ALL_DATA });
        if (data && Array.isArray(data)) { // Apps Script returns raw array for getAllData
            const cleanedData = data.map(item => (typeof item === 'string' ? item.trim() : item));

            appState.data.allNamesFromSheet = data;
        } else {
            console.error('Error: fetchAllStudentData received non-array data:', data);
            appState.data.allNamesFromSheet = [];
            showErrorAlert("Failed to load student data. Server returned unexpected format. Please check Apps Script logs.");
            throw new Error("Invalid data format from server.");
        }
    } catch (error) {
        console.error('Error fetching all student data:', error);
        appState.data.allNamesFromSheet = [];
        showErrorAlert("Failed to load student data. Network or authorization issue. Please check connection, ensure app is authorized, and refresh.");
        throw error; // Re-throw to propagate error to page-specific init
    }
}

/**
 * Populates the course dropdown using the fetched student data.
 * This function is now in common.js as it's needed by both pages.
 */
function populateCourseDropdownFromData() {
    if (appState.data.allNamesFromSheet.length > 0) {
        const uniqueClassNames = new Set();
        appState.data.allNamesFromSheet.forEach(item => {
            if (item && item.Class) {
                uniqueClassNames.add(item.Class);
            }
        });
        appState.data.courses = Array.from(uniqueClassNames).sort(); 
        // No direct populateDropdown call here, page-specific init will handle
    } else {
        appState.data.courses = [];
    }
}


// --- Google Sign-In Initialization & Handlers ---

/**
 * MODIFIED: Now stores the user's email in localStorage on successful sign-in.
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
            
            // --- NEW: Store email for silent sign-in ---
            localStorage.setItem('lastUserEmail', profile.email);

            appState.currentUser.email = profile.email;
            appState.currentUser.name = profile.name;
            appState.currentUser.profilePic = profile.picture;
            appState.currentUser.idToken = tokenData.idToken;

            console.log("User signed in and tokens exchanged successfully!");

            setTimeout(() => {
                if (profilePicture) profilePicture.src = appState.currentUser.profilePic;
                if (dropdownUserName) dropdownUserName.textContent = appState.currentUser.name;
                if (dropdownUserEmail) dropdownUserEmail.textContent = appState.currentUser.email;
                if (infoBarTeacher) infoBarTeacher.textContent = `Teacher: ${appState.currentUser.name}`;

                if (signInPage) signInPage.style.display = 'none'; 
                
                if (appContent) {
                    appContent.classList.remove('hidden');
                    appContent.style.display = 'flex';
                }

                if (bodyElement) bodyElement.classList.remove('justify-center');
                if (profileMenuContainer) profileMenuContainer.classList.remove('hidden');

                if (typeof initializePageSpecificApp === 'function') {
                    initializePageSpecificApp();
                }
            }, 100);

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

/**
 * **UPDATED**: Initializes the Google Sign-In button to use ONLY the Authorization Code Flow.
 */
function initGoogleSignIn() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
        console.error("Google Identity Services library not loaded.");
        if(signInError) showErrorAlert("Google Sign-In library failed to load.");
        return;
    }

    // This is the client that will request the authorization code.
    const codeClient = google.accounts.oauth2.initCodeClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        ux_mode: 'popup',
        access_type: 'offline', // Ask for a refresh token
        //prompt: 'consent',      // Force consent screen for debugging
        callback: (response) => {
            if (response.code) {
                // When we get the code, pass it to our handler.
                handleSignIn(response.code);
            }
        },
    });

    // --- Render a custom Sign-In button ---
    // We create our own button to ensure it's only tied to our codeClient.
    if (googleSignInButton) {
        googleSignInButton.innerHTML = ''; // Clear any existing button
        const customButton = document.createElement('button');
        customButton.textContent = 'Sign in with Google';
        customButton.className = 'bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors';
        customButton.onclick = () => {
            if (loadingOverlay) loadingOverlay.classList.remove('hidden');
            codeClient.requestCode();
        };
        googleSignInButton.appendChild(customButton);
    }
    setupProfileMenu()

}

/**
 * MODIFIED: Handles Google Sign-Out and clears the stored email.
 */
function handleGoogleSignOut() {
    // --- NEW: Clear stored email on sign-out ---
    localStorage.removeItem('lastUserEmail');

    console.log('User signed out.');
    
    appState.currentUser = { email: '', name: '', profilePic: '', idToken: '' };

    if (appContent) appContent.classList.add('hidden');
    if (signInPage) {
        signInPage.classList.remove('hidden');
        signInPage.style.display = 'flex'; // Ensure it's visible
    }
    if (bodyElement) bodyElement.classList.add('justify-center');
    if (profileMenuContainer) profileMenuContainer.classList.add('hidden');
    if (profileDropdown) profileDropdown.classList.add('hidden');

    if (typeof resetPageSpecificAppState === 'function') {
        resetPageSpecificAppState();
    }
}

/**
 * NEW: Attempts to sign the user in automatically on page load using a refresh token.
 */
async function attemptSilentSignIn() {
    const lastUserEmail = localStorage.getItem('lastUserEmail');
    if (!lastUserEmail) {
        // No stored user, so show the regular sign-in button.
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

            // Transition the UI to the main app view
            setTimeout(() => {
                if (profilePicture) profilePicture.src = appState.currentUser.profilePic;
                if (dropdownUserName) dropdownUserName.textContent = appState.currentUser.name;
                if (dropdownUserEmail) dropdownUserEmail.textContent = appState.currentUser.email;
                if (infoBarTeacher) infoBarTeacher.textContent = `Teacher: ${appState.currentUser.name}`;
                
                setupProfileMenu()
                console.log("setting up profile menu");

                if (signInPage) signInPage.style.display = 'none';
                if (appContent) {
                    appContent.classList.remove('hidden');
                    appContent.style.display = 'flex';
                }
                if (bodyElement) bodyElement.classList.remove('justify-center');
                if (profileMenuContainer) profileMenuContainer.classList.remove('hidden');

                if (typeof initializePageSpecificApp === 'function') {
                    initializePageSpecificApp();
                }
            }, 100);

            return true; // Silent sign-in succeeded
        } else {
            throw new Error(tokenData.details || "Refresh token was rejected.");
        }
    } catch (error) {
        console.warn("Silent sign-in failed:", error.message);
        // If it fails, clear the bad email and fall back to manual sign-in.
        localStorage.removeItem('lastUserEmail');
        return false; // Silent sign-in failed
    } finally {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
}

/**
 * NEW: This function is called by the onload attribute in the Google script tag.
 * It ensures that our sign-in logic only runs after Google's library is fully loaded.
 */
async function onGoogleLibraryLoad() {
    // First, try to sign in silently.
    const silentSignInSuccess = await attemptSilentSignIn();

    // If silent sign-in fails, then initialize the manual sign-in button.
    if (!silentSignInSuccess) {
        initGoogleSignIn();
    }
}


// --- Main App Initialization Flow (MODIFIED) ---
// This now only caches DOM elements, as the sign-in logic has been moved.
document.addEventListener('DOMContentLoaded', () => {
    cacheCommonDOMElements();
});