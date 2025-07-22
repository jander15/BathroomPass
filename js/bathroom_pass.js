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
 * Updates the date and time display in the info bar every second.
 */
function startInfoBarClock() {
    setInterval(() => {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'};
        infoBarDateTime.textContent = now.toLocaleDateString('en-US', options);
    }, 1000); // Update every second
}

/**
 * ** NEW FUNCTION with added logging **
 * Updates the selected class in the dropdown if it has changed.
 * @param {string | null} currentClassName - The name of the class that should be selected.
 */
function updateCurrentClass(currentClassName) {
    console.log("--- Starting updateCurrentClass ---");
    console.log("Attempting to select class:", currentClassName);

    if (currentClassName && courseDropdown.value !== currentClassName) {
        // Log all available options in the dropdown for comparison
        const availableOptions = Array.from(courseDropdown.options).map(opt => opt.value);
        console.log("Available options in dropdown:", availableOptions);

        const optionExists = availableOptions.includes(currentClassName);

        if (optionExists) {
            console.log("SUCCESS: Option exists. Setting dropdown value.");
            courseDropdown.value = currentClassName;
            // Manually trigger the 'change' event to update the student list
            courseDropdown.dispatchEvent(new Event('change'));
        } else {
            console.log("FAIL: The class name '" + currentClassName + "' was not found in the dropdown's available options.");
        }
    } else if (!currentClassName) {
        console.log("INFO: No current class name was provided from the backend.");
    } else {
        console.log("INFO: The correct class is already selected.");
    }
}


/**
 * Central function to manage the state of the queue dropdown and buttons.
 */
function updateQueueControls() {
    const isClassSelected = courseDropdown.value && courseDropdown.value !== DEFAULT_CLASS_OPTION;
    const isPassInUse = appState.passHolder || appState.queue.length > 0;

    // The queue is available if a class is selected AND (the pass system is disabled OR the pass is currently in use).
    if (isClassSelected && (!appState.ui.isPassEnabled || isPassInUse)) {
        nameQueueDropdown.removeAttribute("disabled");
    } else {
        nameQueueDropdown.setAttribute("disabled", "disabled");
    }

    toggleAddToQueueButtonVisibility();
}

/**
 * ** UPDATED: This function now defers the disable state if a student is out **
 * Updates the UI to reflect whether the pass system is enabled or disabled.
 * @param {boolean} isEnabled - The current status of the pass system.
 */
function updatePassAvailability(isEnabled) {
    const previousState = appState.ui.isPassEnabled;
    appState.ui.isPassEnabled = isEnabled;

    // If a student is currently signed out, do NOT change the UI.
    // The change will be applied when they sign back in.
    if (appState.passHolder) {
        return; 
    }

    if (isEnabled) {
        formDisabledOverlay.classList.add('hidden');
        mainForm.classList.remove('opacity-50', 'pointer-events-none');
        studentOutHeader.classList.remove('bg-gray-500');

        // If the pass was just re-enabled and no one is out, check the queue.
        if (!previousState && isEnabled && appState.queue.length > 0) {
            const nextPerson = appState.queue.shift();
            preparePassForNextInQueue(nextPerson);
            updateQueueDisplay();
        } else if (!appState.passHolder) {
            headerStatusSpan.textContent = STATUS_PASS_AVAILABLE;
        }

    } else { // isEnabled is false
        formDisabledOverlay.classList.remove('hidden');
        mainForm.classList.add('opacity-50', 'pointer-events-none');
        studentOutHeader.classList.add('bg-gray-500');
        headerStatusSpan.textContent = "PASS UNAVAILABLE";
    }
    
    updateQueueControls();
}

/**
 * A helper function to contain the data loading logic.
 */
async function loadInitialPassData() {
    try {
        await fetchAllStudentData(); 
        populateCourseDropdownFromData();
        populateDropdown('courseDropdown', appState.data.courses, DEFAULT_CLASS_OPTION);
        courseDropdown.disabled = true;
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
        showQueueView();
        
        nameQueueDropdown.value = DEFAULT_NAME_OPTION; 
        updateQueueControls();
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

    //courseDropdown.removeAttribute("disabled");
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
    
    nameQueueDropdown.value = DEFAULT_NAME_OPTION;
    addToQueueButton.classList.add('hidden');
    removeFromQueueButton.classList.add('hidden');
    updateQueueControls();
}

/**
 * Signs in a student automatically without user interaction, typically for class changes.
 * @param {string} studentName The full name of the student to sign in.
 * @param {string} className The class they are being signed in from.
 */
async function autoSignInStudent(studentName, className) {
    // If there's a timer running, stop it and get the final time
    if (appState.timer.intervalId) {
        clearInterval(appState.timer.intervalId);
    }
    const timeOutSeconds = (appState.timer.minutes * 60) + appState.timer.seconds;
    const nameOnly = studentName.includes("(") ? studentName.substring(0, studentName.indexOf("(") - 1).trim() : studentName.trim();

    const payload = {
        action: ACTION_LOG_SIGN_IN,
        Seconds: timeOutSeconds,
        Name: nameOnly,
        Class: className,
    };

    try {
        const data = await sendAuthenticatedRequest(payload);
        if (data.result !== 'success') {
            throw new Error(data.error || 'Auto sign-in failed on the server.');
        }

        // Reset the UI state now that the student is signed in
        resetMainPassUI();
        appState.passHolder = null;
        setPassToAvailableState(); // Reset the main form to its default available state

    } catch (error) {
        console.error('Error during auto sign-in:', error);
        showErrorAlert(`Failed to automatically sign in ${studentName}: ${error.message}`);
    }
}


/**
 * ** UPDATED: This function now applies the deferred disable state **
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

            // Check the global pass status AFTER signing in
            if (!appState.ui.isPassEnabled) {
                // If the pass system is supposed to be disabled, disable it now.
                updatePassAvailability(false);
                setPassToAvailableState();
            } else if (appState.queue.length > 0) {
                // If the system is enabled and there's a queue, promote the next person.
                const nextPerson = appState.queue.shift();
                preparePassForNextInQueue(nextPerson);
            } else {
                // If the system is enabled and the queue is empty, set to available.
                setPassToAvailableState();
            }

            updateQueueDisplay(); 
            updateQueueControls();

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

        if (!appState.passHolder && appState.queue.length === 1 && appState.ui.isPassEnabled) { 
            const nextPerson = appState.queue.shift();
            preparePassForNextInQueue(nextPerson);
            updateQueueDisplay();
        }
    }
    updateQueueControls();
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
    updateQueueControls();
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
        lateNameDropdown.removeAttribute("disabled");
        
        populateNameDropdownsForCourse(selectedCourse); 

        nameDropdown.value = DEFAULT_NAME_OPTION; 
        nameQueueDropdown.value = DEFAULT_NAME_OPTION; 
        lateNameDropdown.value = DEFAULT_NAME_OPTION; 
        infoBarClass.textContent = `Class: ${selectedCourse}`;

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
    updateQueueControls();
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
        startInfoBarClock();
        infoBarTeacher.textContent = `Teacher: ${appState.currentUser.name}`;
        try {
            await loadInitialPassData();
            
            // ** UPDATED: Initial call is now to getLiveState **
            const liveState = await sendAuthenticatedRequest({ action: 'getLiveState' });
            updatePassAvailability(liveState.isEnabled);
            updateCurrentClass(liveState.currentClass);

            // ** UPDATED: Polling now calls getLiveState **
            if (appState.ui.pollingIntervalId) clearInterval(appState.ui.pollingIntervalId);
            appState.ui.pollingIntervalId = setInterval(async () => {
                try {
        const latestState = await sendAuthenticatedRequest({ action: 'getLiveState' });

        // ** NEW LOGIC TO HANDLE CLASS CHANGE **
        // Check if a class was previously set, if the new class is different, and if the new class isn't null
        if (appState.ui.currentClassPeriod && latestState.currentClass && latestState.currentClass !== appState.ui.currentClassPeriod) {
            
            let alertMessage = "Class period changed. ";
            let studentWasSignedOut = false;
            let queueWasCleared = false;

            // 1. Automatically sign in the current pass holder, if one exists
            if (appState.passHolder) {
                const studentToSignIn = appState.passHolder;
                const classOfSignOut = appState.ui.currentClassPeriod; // Use the class period they signed out from
                await autoSignInStudent(studentToSignIn, classOfSignOut);
                alertMessage += `${studentToSignIn} was automatically signed in. `;
                studentWasSignedOut = true;
            }

            // 2. Clear the queue
            if (appState.queue.length > 0) {
                appState.queue = [];
                updateQueueDisplay();
                alertMessage += "The queue has been cleared.";
                queueWasCleared = true;
            }

            // Show a single, combined alert if anything happened
            if (studentWasSignedOut || queueWasCleared) {
                showSuccessAlert(alertMessage.trim());
            }
        }
        
        // Update the current class in the app state for the next check
        appState.ui.currentClassPeriod = latestState.currentClass;

        // The existing logic to update the UI continues as normal
        updatePassAvailability(latestState.isEnabled);
        updateCurrentClass(latestState.currentClass);

    } catch (error) {
        console.error("Polling error:", error);
    }
}, 20000); // Poll every 20 seconds

        } catch (error) {
            console.error("Failed to initialize Bathroom Pass with data:", error);
            showErrorAlert("Could not check pass system status. Please reload.");
            updatePassAvailability(false);
        }
    } else {
        console.warn("User not authenticated. Cannot fetch data for Bathroom Pass.");
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
