// js/bathroom_pass.js

// --- DOM Element Caching (Elements specific to the Bathroom Pass page) ---
const studentOutHeader = document.getElementById('studentOutHeader'); 
const emojiLeft = document.getElementById('emojiLeft'); 
const studentOutNameSpan = document.getElementById('studentOutName'); 
const headerStatusSpan = document.getElementById('headerStatus'); 
const emojiRight = document.getElementById('emojiRight'); 
const mainForm = document.getElementById('form');
const passLabel = document.getElementById('passLabel'); 
const courseDropdown = document.getElementById('courseDropdown');
const nameDropdown = document.getElementById('nameDropdown');
const emojiDropdown = document.getElementById('emojiDropdown');
const signOutButton = document.getElementById('signOutButton');
const signInButton = document.getElementById('signInButton');
const minutesSpan = document.getElementById('minutes');
const secondsSpan = document.getElementById('seconds');
const queueViewBtn = document.getElementById('queueViewBtn');
const lateSignInViewBtn = document.getElementById('lateSignInViewBtn');
const queueArea = document.getElementById('queueArea');
const nameQueueDropdown = document.getElementById('nameQueue');
const addToQueueButton = document.getElementById('add-to-queue');
const messageArea = document.getElementById('message-area'); 
const messageText = document.getElementById('message-text');
const queueList = document.getElementById('queue-list');
const removeFromQueueButton = document.getElementById('remove-from-queue');
const lateSignInView = document.getElementById('lateSignInView');
const lateSignInForm = document.getElementById('lateSignInForm');
const lateNameDropdown = document.getElementById('lateNameDropdown');
const lateSignInSubmitBtn = document.getElementById('lateSignInSubmitBtn');
const formDisabledOverlay = document.getElementById('formDisabledOverlay');


// --- Bathroom Pass Page Specific Functions ---

/**
 * Updates the UI to reflect whether the pass system is enabled or disabled.
 * @param {boolean} isEnabled - The current status of the pass system.
 */
function updatePassAvailability(isEnabled) {
    appState.ui.isPassEnabled = isEnabled;

    if (isEnabled) {
        formDisabledOverlay.classList.add('hidden');
        mainForm.classList.remove('opacity-50', 'pointer-events-none');
        studentOutHeader.classList.remove('bg-gray-500');

        // If the pass is now available and no one is out, check the queue.
        if (!appState.passHolder && appState.queue.length > 0) {
            const nextPerson = appState.queue.shift();
            preparePassForNextInQueue(nextPerson);
            updateQueueDisplay();
        } else if (!appState.passHolder) {
            headerStatusSpan.textContent = STATUS_PASS_AVAILABLE;
        }

    } else {
        formDisabledOverlay.classList.remove('hidden');
        mainForm.classList.add('opacity-50', 'pointer-events-none');
        studentOutHeader.classList.add('bg-gray-500');
        headerStatusSpan.textContent = "PASS UNAVAILABLE";
    }
}

/**
 * A helper function to contain the data loading logic.
 */
async function loadInitialPassData() {
    try {
        await fetchAllStudentData(); 
        populateCourseDropdownFromData();
        populateDropdown('courseDropdown', appState.data.courses, DEFAULT_CLASS_OPTION);
        courseDropdown.disabled = false;
        appState.ui.isDataLoaded = true;
    } catch (error) {
        console.error("Failed to load initial pass data:", error);
        showErrorAlert("Could not load class data. Please reload the page.");
        populateDropdown('courseDropdown', [], "Error loading classes");
    }
}

/**
 * Updates the timer display and applies tardy styling if needed.
 */
function updateTimerDisplay() {
    appState.timer.seconds++;
    if (appState.timer.seconds >= 60) {
        appState.timer.minutes++;
        appState.timer.seconds = 0;
    }
    if (appState.timer.minutes >= TARDY_THRESHOLD_MINUTES && !appState.timer.isTardy) {
        mainForm.style.backgroundColor = FORM_COLOR_TARDY;
        studentOutHeader.style.backgroundColor = FORM_COLOR_TARDY;
        appState.timer.isTardy = true;
    }
    minutesSpan.textContent = appState.timer.minutes;
    secondsSpan.textContent = appState.timer.seconds < 10 ? "0" + appState.timer.seconds : appState.timer.seconds;
}

/**
 * Starts the bathroom pass timer and transitions UI for a signed-out student.
 */
function startPassTimerAndTransitionUI() {
    if (!appState.ui.isPassEnabled) {
        showErrorAlert("The pass system is currently disabled by the teacher.");
        return;
    }
    if (!appState.timer.intervalId) {
        appState.timer.intervalId = setInterval(updateTimerDisplay, 1000);
        appState.timer.isTardy = false; 

        signOutButton.style.display = "none";
        signInButton.style.display = "block";
        signInButton.disabled = false;
        signInButton.classList.remove('opacity-50', 'cursor-not-allowed');
        signInButton.textContent = SIGN_IN_BUTTON_DEFAULT_TEXT;

        nameDropdown.setAttribute("disabled", "disabled");
        courseDropdown.setAttribute("disabled", "disabled");
        emojiDropdown.setAttribute("disabled", "disabled");
        mainForm.style.backgroundColor = FORM_COLOR_OUT;

        const fullString = nameDropdown.value;
        const nameOnly = fullString.includes("(") ? fullString.substring(0, fullString.indexOf("(")-1).trim() : fullString.trim();
        
        studentOutNameSpan.textContent = nameOnly;
        headerStatusSpan.textContent = STATUS_IS_OUT;
        studentOutHeader.style.backgroundColor = FORM_COLOR_OUT;

        const selectedEmoji = emojiDropdown.value;
        if (selectedEmoji !== NO_EMOJI_OPTION && selectedEmoji !== "") {
            emojiLeft.textContent = selectedEmoji;
            emojiRight.textContent = selectedEmoji;
        } else {
            emojiLeft.textContent = "";
            emojiRight.textContent = "";
        }

        appState.passHolder = fullString;
        
        updateQueueDisplay(); 
        
        nameQueueDropdown.value = DEFAULT_NAME_OPTION; 
        nameQueueDropdown.removeAttribute('disabled'); 
        toggleAddToQueueButtonVisibility();
        showQueueView();
    }
}

/**
 * Resets the main pass UI elements to their default state after a sign-in.
 */
function resetMainPassUI() {
    appState.timer.intervalId = null; 
    appState.timer.seconds = 0;
    appState.timer.minutes = 0;
    appState.timer.isTardy = false;
    minutesSpan.textContent = appState.timer.minutes;
    secondsSpan.textContent = "00";
    
    signInButton.style.display = "none";
    signInButton.disabled = false;
    signInButton.classList.remove('opacity-50', 'cursor-not-allowed');
    signInButton.textContent = SIGN_IN_BUTTON_DEFAULT_TEXT;

    courseDropdown.removeAttribute("disabled");
    emojiDropdown.removeAttribute("disabled");
    mainForm.style.backgroundColor = FORM_COLOR_AVAILABLE;
}

/**
 * Prepares the main pass UI for the next student in the queue.
 * @param {string} nextPerson - The name of the next student.
 */
function preparePassForNextInQueue(nextPerson) {
    nameDropdown.value = nextPerson;
    nameDropdown.setAttribute("disabled", "disabled"); 
    updateQueueMessage(`${nextPerson} can now sign out.`); 
    
    const nameOnly = nextPerson.includes("(") ? nextPerson.substring(0, nextPerson.indexOf("(")-1).trim() : nextPerson.trim();
    studentOutNameSpan.textContent = nameOnly; 
    headerStatusSpan.textContent = STATUS_IS_NEXT;
    studentOutHeader.style.backgroundColor = FORM_COLOR_AVAILABLE; 
    
    emojiLeft.textContent = ""; 
    emojiRight.textContent = ""; 
    emojiDropdown.value = NO_EMOJI_OPTION; 
    emojiDropdown.setAttribute("disabled", "disabled"); 

    nameQueueDropdown.removeAttribute('disabled'); 

    handleNameSelectionChange(); 
}

/**
 * Sets the pass system to the "PASS IS AVAILABLE" state.
 */
function setPassToAvailableState() {
    nameDropdown.value = DEFAULT_NAME_OPTION;
    nameDropdown.removeAttribute("disabled");
    signOutButton.style.display = "none"; 
    updateQueueMessage('The queue is empty. No one is currently signed out.');
    
    studentOutNameSpan.textContent = ''; 
    headerStatusSpan.textContent = STATUS_PASS_AVAILABLE;
    studentOutHeader.style.backgroundColor = FORM_COLOR_AVAILABLE;
    
    emojiLeft.textContent = ""; 
    emojiRight.textContent = ""; 
    emojiDropdown.value = NO_EMOJI_OPTION; 
    
    nameQueueDropdown.setAttribute("disabled", "disabled"); 
    nameQueueDropdown.value = DEFAULT_NAME_OPTION;
    addToQueueButton.classList.add('hidden');
    removeFromQueueButton.classList.add('hidden');
}

/**
 * Handles the main Bathroom Pass sign-in form submission.
 * @param {Event} event - The form submission event.
 */
async function handleMainFormSubmit(event) {
    event.preventDefault();
    
    signInButton.disabled = true;
    signInButton.classList.add('opacity-50', 'cursor-not-allowed');
    signInButton.textContent = "Processing...";
    
    clearInterval(appState.timer.intervalId); 

    const nameOnly = appState.passHolder.includes("(") ? appState.passHolder.substring(0, appState.passHolder.indexOf("(")-1).trim() : appState.passHolder.trim();
    const classValue = courseDropdown.value;
    const timeOutSeconds = (appState.timer.minutes * 60) + appState.timer.seconds;

    const payload = {
        action: ACTION_LOG_SIGN_IN,
        Seconds: timeOutSeconds, 
        Name: nameOnly, 
        Class: classValue, 
    };

    try {
        const data = await sendAuthenticatedRequest(payload); 

        if (data.result === 'success') {
            const signedInStudentName = appState.passHolder; 
            resetMainPassUI(); 
            showSuccessAlert(`${signedInStudentName} has been signed in successfully!`);
            appState.passHolder = null; 

            if (appState.queue.length > 0 && appState.ui.isPassEnabled) {
                const nextPerson = appState.queue.shift();
                preparePassForNextInQueue(nextPerson);
            } else {
                setPassToAvailableState();
            }
            updateQueueDisplay(); 
            toggleAddToQueueButtonVisibility();
        } else {
            throw new Error(data.error || 'Unknown error from server.');
        }
    } catch (error) {
        console.error('Error submitting main sign in:', error);
        showErrorAlert(`Failed to submit sign-in: ${error.message}. Please try again.`);
        signInButton.style.display = "block"; 
        signInButton.disabled = false;
        signInButton.classList.remove('opacity-50', 'cursor-not-allowed');
        signInButton.textContent = SIGN_IN_BUTTON_DEFAULT_TEXT;
        if (appState.passHolder) { 
            appState.timer.intervalId = setInterval(updateTimerDisplay, 1000); 
        }
    }
}

/**
 * Handles the Late Sign In form submission.
 * @param {Event} event - The form submission event.
 */
async function handleLateSignInFormSubmit(event) {
    event.preventDefault();
    const selectedLateName = lateNameDropdown.value;

    if (selectedLateName === "" || selectedLateName === DEFAULT_NAME_OPTION ) { 
        showErrorAlert(`Please select a valid name to sign in late.`);
        return;
    }

    lateSignInSubmitBtn.disabled = true;
    lateSignInSubmitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    lateSignInSubmitBtn.textContent = "Processing...";

    const nameOnly = selectedLateName.includes("(") ? selectedLateName.substring(0, selectedLateName.indexOf("(")-1).trim() : selectedLateName.trim();
    const classValue = courseDropdown.value;

    const payload = {
        action: ACTION_LOG_LATE_SIGN_IN,
        Name: nameOnly, 
        Class: classValue,
    };

    try {
        const data = await sendAuthenticatedRequest(payload); 
        if (data.result === 'success') {
            showSuccessAlert(`${selectedLateName} has been signed in late successfully!`);
            lateNameDropdown.value = DEFAULT_NAME_OPTION; 
            handleLateNameSelectionChange(); // This will hide the button
        } else {
            throw new Error(data.error || 'Unknown error from server.');
        }
    } catch (error) {
        console.error('Error submitting late sign in:', error);
        showErrorAlert(`Failed to submit late sign-in: ${error.message}`);
    } finally {
        lateSignInSubmitBtn.disabled = false;
        lateSignInSubmitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        lateSignInSubmitBtn.textContent = LATE_SIGN_IN_BUTTON_DEFAULT_TEXT;
    }
}

/**
 * Extracts a number from a name string (e.g., for sorting queue).
 * @param {string} name - The name string.
 * @returns {number} The extracted number or Infinity if none.
 */
function getNumberFromName(name) {
    const match = name.match(/\((\d+)\)$/);
    return match ? parseInt(match[1]) : Infinity;
}

/**
 * Updates the queue message display.
 * @param {string} message - The message to display.
 */
function updateQueueMessage(message) {
    messageText.textContent = message;
    messageText.classList.remove('hidden'); 
}

/**
 * Updates the visual display of the queue.
 */
function updateQueueDisplay() {
    queueList.innerHTML = ''; 
    appState.selectedQueueName = null; 
    removeFromQueueButton.classList.add('hidden'); 

    if (appState.queue.length === 0) {
        queueList.style.display = 'none'; 
        if (!appState.passHolder) { 
           updateQueueMessage('The queue is currently empty. Add your name!');
        } else { 
           updateQueueMessage('No one else is in queue. Select your name below to add.');
        }
    } else {
        queueList.style.display = 'block'; 
        updateQueueMessage('Select a name to remove, or add another.');
        appState.queue.sort((a, b) => getNumberFromName(a) - getNumberFromName(b));
        appState.queue.forEach((person) => {
            const listItem = document.createElement('li');
            listItem.textContent = person; 
            listItem.addEventListener('click', () => {
                Array.from(queueList.children).forEach(item => {
                    item.classList.remove('bg-yellow-200-selected');
                });
                appState.selectedQueueName = person;
                listItem.classList.add('bg-yellow-200-selected');
                removeFromQueueButton.classList.remove('hidden');
            });
            queueList.appendChild(listItem);
        });
    }
    toggleAddToQueueButtonVisibility(); 
}

/**
 * Toggles the visibility of the "Add to Queue" button.
 */
function toggleAddToQueueButtonVisibility() {
    const isNameSelectedInQueueDropdown = nameQueueDropdown.value !== "" && nameQueueDropdown.value !== DEFAULT_NAME_OPTION;
    const isQueueDropdownEnabled = !nameQueueDropdown.disabled; 
    
    if (isNameSelectedInQueueDropdown && isQueueDropdownEnabled) {
        addToQueueButton.classList.remove('hidden');
    } else {
        addToQueueButton.classList.add('hidden');
    }
}

/**
 * Handles adding a student to the queue.
 */
function handleAddToQueueClick() {
    const name = nameQueueDropdown.value.trim();

    if (name === "" || name === DEFAULT_NAME_OPTION) {
        updateQueueMessage('Please select your name to add to the queue.');
    } else if (appState.queue.includes(name)) {
        updateQueueMessage(`${name} is already in the queue.`);
    } else if (appState.passHolder && name === appState.passHolder) {
        updateQueueMessage(`${name} is currently signed out and cannot be added to the queue.`);
    } else {
        appState.queue.push(name);
        updateQueueMessage(`${name} has been added to the queue.`);
        updateQueueDisplay();
        nameQueueDropdown.value = DEFAULT_NAME_OPTION; 
        toggleAddToQueueButtonVisibility(); 

        if (!appState.passHolder && appState.queue.length === 1 && appState.ui.isPassEnabled) { 
            const nextPerson = appState.queue.shift();
            preparePassForNextInQueue(nextPerson);
            updateQueueDisplay();
        }
    }
}

/**
 * Handles removing a student from the queue.
 */
function handleRemoveFromQueueClick() {
    if (appState.queue.length === 0) {
        updateQueueMessage('The queue is already empty.');
    } else if (!appState.selectedQueueName) {
        updateQueueMessage('Please select a name from the list to remove.');
    } else {
        const index = appState.queue.indexOf(appState.selectedQueueName);
        if (index > -1) {
            const removedName = appState.selectedQueueName;
            appState.queue.splice(index, 1);
            updateQueueMessage(`Removed ${removedName} from the queue.`);
            updateQueueDisplay(); 
        } else {
            updateQueueMessage('Error: Name not found in queue.'); 
        }
    }
}

/**
 * Populates name-related dropdowns based on the selected course.
 */
function populateNameDropdownsForCourse(selectedCourseName) {
    const namesForCourseSet = new Set();
    
    if (selectedCourseName && selectedCourseName !== DEFAULT_CLASS_OPTION && selectedCourseName !== "") {
        appState.data.allNamesFromSheet.forEach(item => {
            if (item && item.Class === selectedCourseName && item.Name) {
                namesForCourseSet.add(item.Name);
            }
        });
    }
    
    const sortedNames = Array.from(namesForCourseSet).sort();
    
    populateDropdown('nameDropdown', sortedNames, DEFAULT_NAME_OPTION, DEFAULT_NAME_OPTION);
    populateDropdown('nameQueue', sortedNames, DEFAULT_NAME_OPTION, DEFAULT_NAME_OPTION);
    populateDropdown('lateNameDropdown', sortedNames, DEFAULT_NAME_OPTION, DEFAULT_NAME_OPTION);
}

/**
 * Handles changes in the class dropdown.
 */
function handleCourseSelectionChange(){
    const selectedCourse = courseDropdown.value;
    signOutButton.style.display = "none";

    if (selectedCourse !== "" && selectedCourse !== DEFAULT_CLASS_OPTION) {
        nameDropdown.removeAttribute("disabled");
        nameQueueDropdown.removeAttribute("disabled");
        lateNameDropdown.removeAttribute("disabled");
        
        populateDropdown('nameDropdown', [], LOADING_OPTION, LOADING_OPTION); 
        populateDropdown('nameQueue', [], LOADING_OPTION, LOADING_OPTION); 
        populateDropdown('lateNameDropdown', [], LOADING_OPTION, LOADING_OPTION); 

        populateNameDropdownsForCourse(selectedCourse); 

        nameDropdown.value = DEFAULT_NAME_OPTION; 
        nameQueueDropdown.value = DEFAULT_NAME_OPTION; 
        lateNameDropdown.value = DEFAULT_NAME_OPTION; 
        
        if (!appState.passHolder && appState.queue.length === 0) { 
            nameQueueDropdown.setAttribute("disabled", "disabled");
            nameQueueDropdown.value = DEFAULT_NAME_OPTION; 
        } else { 
            nameQueueDropdown.removeAttribute("disabled");
        }

        emojiDropdown.removeAttribute("disabled"); 
        emojiDropdown.value = NO_EMOJI_OPTION; 

    } else { 
        const nameDropdownsToDisable = ['nameDropdown', 'nameQueue', 'lateNameDropdown'];
        nameDropdownsToDisable.forEach(id => {
            const ddElement = document.getElementById(id);
            populateDropdown(id, [], DEFAULT_NAME_OPTION, DEFAULT_NAME_OPTION); 
            ddElement.setAttribute("disabled", "disabled");
            ddElement.value = DEFAULT_NAME_OPTION; 
        });

        emojiDropdown.setAttribute("disabled", "disabled");
        emojiDropdown.value = NO_EMOJI_OPTION; 
        signOutButton.style.display = "none"; 
    }
    toggleAddToQueueButtonVisibility();
    handleLateNameSelectionChange(); 
    handleNameSelectionChange();
}

/**
 * Handles changes in the name dropdown to toggle sign-out button and emoji dropdown.
 */
function handleNameSelectionChange(){
    const isDefaultSelected = nameDropdown.value === "" || nameDropdown.value === DEFAULT_NAME_OPTION;
    const isTimerRunning = appState.timer.intervalId !== null;
    const isCurrentStudentSelected = nameDropdown.value === appState.passHolder;

    if (isDefaultSelected || isTimerRunning || isCurrentStudentSelected) {
        signOutButton.style.display = "none";
        emojiDropdown.setAttribute("disabled", "disabled");
        emojiDropdown.value = NO_EMOJI_OPTION; 
        if (isDefaultSelected || isCurrentStudentSelected) {
            emojiLeft.textContent = "";
            emojiRight.textContent = "";
        }
    } else { 
        signOutButton.style.display = "block";
        emojiDropdown.removeAttribute("disabled");
    }
    signInButton.style.display = isTimerRunning ? "block" : "none";
}

/**
 * Handles changes in the late sign-in name dropdown to show/hide the submit button.
 */
function handleLateNameSelectionChange() {
    const selectedName = lateNameDropdown.value;
    const isNameSelected = selectedName && selectedName !== DEFAULT_NAME_OPTION;
    lateSignInSubmitBtn.classList.toggle('hidden', !isNameSelected);
}


/**
 * Displays the queue view and updates button styles.
 */
function showQueueView() {
    queueArea.classList.remove('hidden');
    lateSignInView.classList.add('hidden');
    appState.ui.currentRightView = 'queue';

    queueViewBtn.classList.add('bg-purple-400', 'text-white');
    queueViewBtn.classList.remove('bg-yellow-200', 'text-gray-800');
    lateSignInViewBtn.classList.add('bg-yellow-200', 'text-gray-800');
    lateSignInViewBtn.classList.remove('bg-purple-400', 'text-white');
}

/**
 * Displays the late sign-in view and updates button styles.
 */
function showLateSignInView() {
    queueArea.classList.add('hidden');
    lateSignInView.classList.remove('hidden');
    appState.ui.currentRightView = 'lateSignIn';

    lateSignInViewBtn.classList.add('bg-yellow-200', 'text-gray-800');
    lateSignInViewBtn.classList.remove('bg-purple-400', 'text-white');
    queueViewBtn.classList.add('bg-purple-400', 'text-white');
    queueViewBtn.classList.remove('bg-yellow-200', 'text-gray-800');
}

/**
 * Initializes the Bathroom Pass application elements and fetches initial data.
 */
async function initializePageSpecificApp() {
    alertDiv.classList.add("hidden");
    errorAlertDiv.classList.add("hidden");

    studentOutNameSpan.textContent = '';
    headerStatusSpan.textContent = STATUS_PASS_AVAILABLE;
    studentOutHeader.style.backgroundColor = FORM_COLOR_AVAILABLE;
    emojiLeft.textContent = "";
    emojiRight.textContent = "";

    updateQueueDisplay(); 
    toggleAddToQueueButtonVisibility(); 

    populateDropdown('courseDropdown', [], LOADING_OPTION, "");
    courseDropdown.setAttribute("disabled", "disabled");

    const nameDropdownsToInit = ['nameDropdown', 'nameQueue', 'lateNameDropdown'];
    nameDropdownsToInit.forEach(id => {
        populateDropdown(id, [], DEFAULT_NAME_OPTION, DEFAULT_NAME_OPTION); 
        document.getElementById(id).setAttribute("disabled", "disabled");
    });
    
    addToQueueButton.classList.add('hidden');
    removeFromQueueButton.classList.add('hidden');

    populateDropdown('emojiDropdown', EMOJI_LIST, NO_EMOJI_OPTION, NO_EMOJI_OPTION);
    emojiDropdown.setAttribute("disabled", "disabled");
    
    signOutButton.style.display = "none";
    signInButton.style.display = "none"; 
    signInButton.textContent = SIGN_IN_BUTTON_DEFAULT_TEXT; 

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            await loadInitialPassData(); // Always load data for queue/late sign in
            
            const statusPayload = await sendAuthenticatedRequest({ action: 'getPassStatus' });
            updatePassAvailability(statusPayload.isEnabled);

            if (appState.ui.pollingIntervalId) clearInterval(appState.ui.pollingIntervalId);
            appState.ui.pollingIntervalId = setInterval(async () => {
                try {
                    const latestStatus = await sendAuthenticatedRequest({ action: 'getPassStatus' });
                    updatePassAvailability(latestStatus.isEnabled);
                } catch (error) {
                    console.error("Polling error:", error);
                }
            }, 20000);

        } catch (error) {
            console.error("Failed to initialize Bathroom Pass with data:", error);
            showErrorAlert("Could not check pass system status. Please reload.");
            updatePassAvailability(false);
        }
    } else {
        console.warn("User email or ID token not available. Cannot fetch data for Bathroom Pass.");
    }
    
    showLateSignInView(); 
    handleLateNameSelectionChange();
}

/**
 * Resets all Bathroom Pass page specific UI and state.
 */
function resetPageSpecificAppState() {
    if (appState.timer.intervalId) {
        clearInterval(appState.timer.intervalId);
    }
    if (appState.ui.pollingIntervalId) {
        clearInterval(appState.ui.pollingIntervalId);
        appState.ui.pollingIntervalId = null;
    }
    
    appState.timer = { seconds: 0, minutes: 0, intervalId: null, isTardy: false };
    appState.passHolder = null;
    appState.queue = [];
    appState.selectedQueueName = null;
    appState.data = { allNamesFromSheet: [], courses: [], namesForSelectedCourse: [] };
    appState.ui.isDataLoaded = false;
    appState.ui.isPassEnabled = true;

    minutesSpan.textContent = "0";
    secondsSpan.textContent = "00";
    
    signInButton.style.display = "none";
    signOutButton.style.display = "none";
    mainForm.style.backgroundColor = FORM_COLOR_AVAILABLE;
    studentOutNameSpan.textContent = '';
    headerStatusSpan.textContent = STATUS_PASS_AVAILABLE;
    studentOutHeader.style.backgroundColor = FORM_COLOR_AVAILABLE;
    emojiLeft.textContent = "";
    emojiRight.textContent = "";
    
    const dropdownsToReset = ['courseDropdown', 'nameDropdown', 'nameQueue', 'lateNameDropdown'];
    dropdownsToReset.forEach(id => {
        const ddElement = document.getElementById(id);
        populateDropdown(id, [], (id === 'courseDropdown' ? DEFAULT_CLASS_OPTION : DEFAULT_NAME_OPTION), "");
        ddElement.setAttribute("disabled", "disabled");
    });

    populateDropdown('emojiDropdown', EMOJI_LIST, NO_EMOJI_OPTION, NO_EMOJI_OPTION);
    emojiDropdown.setAttribute("disabled", "disabled"); 

    addToQueueButton.classList.add('hidden');
    removeFromQueueButton.classList.add('hidden');

    showLateSignInView(); 
    updateQueueDisplay(); 
}


// --- Event Listeners ---
courseDropdown.addEventListener("change", handleCourseSelectionChange);
nameDropdown.addEventListener("change", handleNameSelectionChange);
signOutButton.addEventListener("click", startPassTimerAndTransitionUI);
mainForm.addEventListener("submit", handleMainFormSubmit); 
lateSignInForm.addEventListener('submit', handleLateSignInFormSubmit);
lateNameDropdown.addEventListener('change', handleLateNameSelectionChange);
nameQueueDropdown.addEventListener('change', toggleAddToQueueButtonVisibility);
addToQueueButton.addEventListener('click', handleAddToQueueClick);
removeFromQueueButton.addEventListener('click', handleRemoveFromQueueClick);
queueViewBtn.addEventListener('click', showQueueView);
lateSignInViewBtn.addEventListener('click', showLateSignInView);
