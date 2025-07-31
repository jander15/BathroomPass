// js/common.js

// --- Constants ---
const GOOGLE_CLIENT_ID = '793583956284-3bnmlmr42c18s79mfj8fkcrci3a197j3.apps.googleusercontent.com';
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
        currentClassPeriod: null

    },
    sortState: {
        signOut: { column: 'Date', direction: 'desc' },
        classTrends: { column: 'TimeOut', direction: 'desc' }
    }
};

// --- Common DOM Element References (Declared, then assigned in cacheCommonDOMElements) ---
// These are declared as 'let' so they can be assigned after DOMContentLoaded.
let signInPage;
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
 * Makes an authenticated POST request to the Apps Script backend.
 * @param {object} payload - The data payload to send to the backend.
 * @returns {Promise<object>} The JSON response from the backend.
 */
async function sendAuthenticatedRequest(payload, isInitialAuth = false) {
    if (!appState.currentUser.idToken && !isInitialAuth) {
        throw new Error("User not authenticated. Missing ID token.");
    }

    // On initial auth, the payload already contains the necessary tokens.
    if (!isInitialAuth) {
        payload.userEmail = appState.currentUser.email;
        payload.idToken = appState.currentUser.idToken;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            // Check for specific backend errors that indicate an expired token
            if (errorText.includes("Token-Email mismatch") || errorText.includes("Invalid token")) {
                throw new Error("SESSION_EXPIRED");
            }
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const data = await response.json();
        if (data.result === 'error') {
            if (data.error && (data.error.includes("SESSION_EXPIRED"))) {
                throw new Error("SESSION_EXPIRED");
            }
            throw new Error(data.error || 'An unknown error occurred on the server.');
        }
        return data;

    } catch (error) {
        if (error.message === "SESSION_EXPIRED") {
            console.warn("Session expired. Attempting silent refresh...");
            try {
                // Call the new refreshToken action
                const refreshPayload = {
                    action: ACTION_REFRESH_TOKEN,
                    userEmail: appState.currentUser.email,
                    idToken: appState.currentUser.idToken
                };
                const refreshResponse = await sendAuthenticatedRequest(refreshPayload, true); // Use `true` to avoid infinite loop

                if (refreshResponse.result === 'success' && refreshResponse.idToken) {
                    console.log("Token successfully refreshed. Retrying original request.");
                    // Update the global token with the new one
                    appState.currentUser.idToken = refreshResponse.idToken;
                    // Retry the original request with the new token
                    payload.idToken = appState.currentUser.idToken;
                    return await sendAuthenticatedRequest(payload);
                }
            } catch (refreshError) {
                console.error("Silent refresh failed.", refreshError);
                // If the refresh itself fails, the session is truly dead.
                throw new Error("SESSION_EXPIRED");
            }
        }
        // Re-throw any other errors
        throw error;
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
 * Initializes the Google Identity Services client and renders the sign-in button.
 * This is the primary entry point for GSI setup after common DOM elements are cached.
 */
function initGoogleSignIn() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
        console.error("Google Identity Services library not loaded.");
        if (signInError) showErrorAlert("Google Sign-In library failed to load. Please check your internet connection.");
        return;
    }

    // --- Initialize the Google Sign-In client ---
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleSignInResponse 
    });

    // --- Render the Sign-In button on the page ---
    if (googleSignInButton) { 
        google.accounts.id.renderButton(
            googleSignInButton,
            { theme: 'dark', size: 'large', text: 'signin_with', shape: 'rectangular', logo_alignment: 'left' }
        );
    } else {
        console.warn("Google Sign-In button not found on this page.");
    }

    // --- Set up the Authorization Code Flow client ---
    const codeClient = google.accounts.oauth2.initCodeClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid', // Standard scopes to get user info
        ux_mode: 'popup',
        callback: (response) => {
            // This callback receives the Authorization Code
            if (response.code) {
                // Now, call our handler to exchange the code
                exchangeAuthCodeForTokens(response.code);
            }
        },
    });

    // Attach the code flow to our sign-in button
    if (googleSignInButton) {
        googleSignInButton.onclick = () => codeClient.requestCode();
    }


    // --- Set up profile menu and sign-out functionality ---
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
 * Exchanges the one-time authorization code for long-term tokens from our backend.
 * This is the new core function for the secure sign-in flow.
 * @param {string} authCode - The authorization code from Google.
 */
async function exchangeAuthCodeForTokens(authCode) {
    try {
        // We still need an initial ID token to verify the user's email on the backend
        const initialCredential = await new Promise((resolve, reject) => {
             google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    reject(new Error("Google prompt was not displayed or was skipped."));
                }
             });
             google.accounts.id.requestVerifiedIdToken({
                nonce: Math.random().toString(36).substring(2, 15) // A random nonce for security
             }).then(resolve).catch(reject);
        });

        const profile = decodeJwtResponse(initialCredential.credential);
        
        const payload = {
            action: 'exchangeCodeForTokens',
            code: authCode,
            idToken: initialCredential.credential, // Send the initial token for verification
            userEmail: profile.email
        };

        // Call the new backend action
        const tokenData = await sendAuthenticatedRequest(payload, true); // `true` to bypass normal token check

        if (tokenData.result === 'success' && tokenData.idToken) {
            // Update the app state with the user's profile and the NEW, longer-lasting ID token
            appState.currentUser.email = profile.email;
            appState.currentUser.name = profile.name;
            appState.currentUser.profilePic = profile.picture;
            appState.currentUser.idToken = tokenData.idToken;

            // Transition UI to the main application
            if (profilePicture) profilePicture.src = appState.currentUser.profilePic;
            if (dropdownUserName) dropdownUserName.textContent = appState.currentUser.name;
            if (dropdownUserEmail) dropdownUserEmail.textContent = appState.currentUser.email;
            if (signInPage) signInPage.classList.add('hidden');
            if (appContent) appContent.classList.remove('hidden');
            if (bodyElement) bodyElement.classList.remove('justify-center');
            if (profileMenuContainer) profileMenuContainer.classList.remove('hidden');

            if (typeof initializePageSpecificApp === 'function') {
                initializePageSpecificApp();
            }
        } else {
            throw new Error("Failed to get a valid ID token from the server.");
        }

    } catch (error) {
        console.error("Authorization code exchange failed:", error);
        showErrorAlert("Could not complete the sign-in process. Please try again.");
    }
}

/**
 * Callback function for successful Google Sign-In.
 * Updates global appState and transitions UI.
 * @param {CredentialResponse} response - The credential response from GSI.
 */
function handleGoogleSignInResponse(response) {
    console.log('User signed in successfully with GSI!');
    const profile = decodeJwtResponse(response.credential);
    
    appState.currentUser.email = profile.email;
    appState.currentUser.name = profile.name;
    appState.currentUser.profilePic = profile.picture;
    appState.currentUser.idToken = response.credential;

    // Update profile menu UI (common to all app pages)
    if (profilePicture) profilePicture.src = appState.currentUser.profilePic;
    if (dropdownUserName) dropdownUserName.textContent = appState.currentUser.name;
    if (dropdownUserEmail) dropdownUserEmail.textContent = appState.currentUser.email;

    // Transition UI (common to all app pages)
    if (signInPage) signInPage.classList.add('hidden');
    if (appContent) appContent.classList.remove('hidden');
    if (bodyElement) bodyElement.classList.remove('justify-center');
    if (profileMenuContainer) profileMenuContainer.classList.remove('hidden');

    // Call the page-specific initialization function.
    // This function MUST be defined in the page-specific JS file (e.g., bathroom_pass.js, teacher_dashboard.js)
    // and is expected to be globally available when common.js calls it.
    if (typeof initializePageSpecificApp === 'function') {
        initializePageSpecificApp();
    } else {
        console.error("initializePageSpecificApp not found. Page-specific initialization skipped. Ensure it's defined in the page's JS file and loaded.");
        showErrorAlert("Application could not initialize. Please contact support.");
    }
}

/**
 * Handles Google Sign-Out.
 * Resets global appState and transitions UI.
 */
function handleGoogleSignOut() {
    google.accounts.id.disableAutoSelect();
    console.log('User signed out.');
    
    appState.currentUser = { email: '', name: '', profilePic: '', idToken: '' };

    if (appContent) appContent.classList.add('hidden');
    if (signInPage) signInPage.classList.remove('hidden');
    if (bodyElement) bodyElement.classList.add('justify-center');
    if (profileMenuContainer) profileMenuContainer.classList.add('hidden');
    if (profileDropdown) profileDropdown.classList.add('hidden');

    // Call the page-specific reset function.
    // This function MUST be defined in the page-specific JS file.
    if (typeof resetPageSpecificAppState === 'function') {
        resetPageSpecificAppState();
    } else {
        console.warn("resetPageSpecificAppState not found. Page-specific reset skipped.");
    }
}

// --- Main App Initialization Flow (Centralized DOMContentLoaded handling) ---
// This ensures common DOM elements are cached and GSI is initialized after the DOM is ready.
document.addEventListener('DOMContentLoaded', () => {
    cacheCommonDOMElements(); // Cache all common DOM elements first
    initGoogleSignIn();        // Then initialize GSI and render button
});