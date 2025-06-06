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
const ACTION_GET_ALL_DATA = 'getAllData';
const ACTION_GET_REPORT_DATA = 'getReportData'; // Added for dashboard
const TARDY_THRESHOLD_MINUTES = 5;
const EMOJI_LIST = ['🚽', '🚿', '🛁', '🧻', '🧼', '🧴', '💦', '💧', '🏃‍♂️', '💨', '🤫', '🚶‍♀️', '😅', '✨', '🚻', '🚾'];
const FORM_COLOR_AVAILABLE = "#4ade80"; // Green
const FORM_COLOR_OUT = "#f6b26b"; // Orange
const FORM_COLOR_TARDY = "#ef4444"; // Red
const LATE_SIGN_IN_BUTTON_DEFAULT_TEXT = "Sign In Late";
const SIGN_IN_BUTTON_DEFAULT_TEXT = "Sign In";


// --- Global State Management ---
// This object will hold the shared application state.
// Other script files can access properties of appState.
const appState = {
    currentUser: { email: '', name: '', profilePic: '', idToken: '' },
    timer: { seconds: 0, minutes: 0, intervalId: null, isTardy: false },
    passHolder: null, // Stores the name of the student currently out on pass
    queue: [], // Array of names in the queue
    selectedQueueName: null, // The name selected in the queue for removal
    data: { allNamesFromSheet: [], courses: [], namesForSelectedCourse: [] }, // All fetched data
    ui: { currentRightView: 'lateSignIn' } // Tracks which right-side panel is active
};


// --- DOM Element Caching (Elements common to multiple pages or global) ---
// These are cached here once to avoid repeated document.getElementById calls.
const signInPage = document.getElementById('signInPage');
const googleSignInButton = document.getElementById('googleSignInButton');
const signInError = document.getElementById('signInError');
const appContent = document.getElementById('appContent');
const bodyElement = document.getElementById('body');
const profileMenuContainer = document.getElementById('profileMenuContainer');
const profilePicture = document.getElementById('profilePicture');
const profileDropdown = document.getElementById('profileDropdown');
const dropdownUserName = document.getElementById('dropdownUserName');
const dropdownUserEmail = document.getElementById('dropdownUserEmail');
const dropdownSignOutButton = document.getElementById('dropdownSignOutButton');
const alertDiv = document.getElementById('alertDiv');
const alertMessageSpan = document.getElementById('alertMessage');
const errorAlertDiv = document.getElementById('errorAlertDiv');
const errorAlertMessageSpan = document.getElementById('errorAlertMessage');


// --- Utility Functions ---

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
    alertDiv.classList.remove("hidden", "bg-red-100", "border-red-400", "text-red-700");
    alertDiv.classList.add("bg-green-100", "border-green-400", "text-green-700");
    alertMessageSpan.textContent = message;
    setTimeout(() => alertDiv.classList.add('hidden'), 5000);
}

/**
 * Shows an error alert message.
 * @param {string} message - The message to display.
 */
function showErrorAlert(message) {
    errorAlertDiv.classList.remove("hidden", "bg-green-100", "border-green-400", "text-green-700");
    errorAlertDiv.classList.add("bg-red-100", "border-red-400", "text-red-700");
    errorAlertMessageSpan.textContent = message;
    setTimeout(() => errorAlertDiv.classList.add('hidden'), 10000);
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
async function sendAuthenticatedRequest(payload) {
    if (!appState.currentUser.idToken) {
        throw new Error("User not authenticated. Missing ID token.");
    }
    
    // Add common authentication parameters
    payload.userEmail = appState.currentUser.email;
    payload.idToken = appState.currentUser.idToken;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    return response.json();
}

/**
 * Fetches all student data for the current teacher from the backend.
 * This is a common utility for both Bathroom Pass and Teacher Dashboard.
 */
async function fetchAllStudentData() {
    try {
        const data = await sendAuthenticatedRequest({ action: ACTION_GET_ALL_DATA });
        if (data && Array.isArray(data)) { // Apps Script returns raw array for getAllData
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


// --- Google Sign-In Initialization & Handlers ---

/**
 * Initializes the Google Identity Services client and renders the sign-in button.
 */
function initGoogleSignIn() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
        console.error("Google Identity Services library not loaded.");
        // Potentially show a user-facing error or retry mechanism
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleSignInResponse 
    });
    google.accounts.id.renderButton(
        googleSignInButton,
        { theme: 'dark', size: 'large', text: 'signin_with', shape: 'rectangular', logo_alignment: 'left' }
    );
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
    profilePicture.src = appState.currentUser.profilePic;
    dropdownUserName.textContent = appState.currentUser.name;
    dropdownUserEmail.textContent = appState.currentUser.email;

    // Hide sign-in page and show app content (common to all app pages)
    signInPage.classList.add('hidden');
    appContent.classList.remove('hidden');
    bodyElement.classList.remove('justify-center');
    profileMenuContainer.classList.remove('hidden');

    // Call the page-specific initialization function.
    // This function MUST be defined in the page-specific JS file (e.g., bathroom_pass.js, teacher_dashboard.js)
    // and should handle its own DOMContentLoaded or ensure it's available globally before this is called.
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

    appContent.classList.add('hidden');
    signInPage.classList.remove('hidden');
    bodyElement.classList.add('justify-center');
    profileMenuContainer.classList.add('hidden');
    profileDropdown.classList.add('hidden');

    // Call the page-specific reset function.
    // This function MUST be defined in the page-specific JS file.
    if (typeof resetPageSpecificAppState === 'function') {
        resetPageSpecificAppState();
    } else {
        console.warn("resetPageSpecificAppState not found. Page-specific reset skipped.");
    }
}

// --- Global Event Listeners ---

// Event listeners for the Google Profile dropdown.
if (profilePicture && dropdownSignOutButton && profileMenuContainer && profileDropdown && bodyElement) {
    profilePicture.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent document click from closing it immediately
        profileDropdown.classList.toggle('hidden');
    });

    dropdownSignOutButton.addEventListener('click', handleGoogleSignOut);

    // Close profile dropdown when clicking outside of it.
    bodyElement.addEventListener('click', (event) => { 
        if (!profileMenuContainer.contains(event.target) && !profileDropdown.classList.contains('hidden')) {
            profileDropdown.classList.add('hidden');
        }
    });
} else {
    console.error("Common UI elements for profile menu not found. Ensure HTML IDs are correct.");
}

// initGoogleSignIn will be called by each page's DOMContentLoaded.
// The main common.js file does not call it directly anymore.
