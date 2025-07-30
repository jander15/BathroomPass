// js/bathroom_pass.js

// --- DOM Element Caching (Elements specific to the Bathroom Pass page) ---
const studentOutHeader = document.getElementById('studentOutHeader'); 
const emojiLeft = document.getElementById('emojiLeft'); 
const studentOutNameSpan = document.getElementById('studentOutName'); 
const headerStatusSpan = document.getElementById('headerStatus'); 
const emojiRight = document.getElementById('emojiRight'); 
const mainForm = document.getElementById('form');
const passLabel = document.getElementById('passLabel'); 
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
const infoBarDateTime = document.getElementById('infoBarDateTime');
const infoBarTeacher = document.getElementById('infoBarTeacher');
const infoBarClass = document.getElementById('infoBarClass');
const travelPassViewBtn = document.getElementById('travelPassViewBtn');
const travelPassArea = document.getElementById('travelPassArea');

// ** START: New Travel Pass DOM Elements **
const travelDepartingBtn = document.getElementById('travelDepartingBtn');
const travelArrivingBtn = document.getElementById('travelArrivingBtn');
const travelDepartingSection = document.getElementById('travelDepartingSection');
const travelArrivingSection = document.getElementById('travelArrivingSection');
const travelSignOutName = document.getElementById('travelSignOutName');
const travelSignOutSubmitBtn = document.getElementById('travelSignOutSubmitBtn');
const travelSignInName = document.getElementById('travelSignInName');
const travelSignInSubmitBtn = document.getElementById('travelSignInSubmitBtn');
// ** END: New Travel Pass DOM Elements **

const manualSyncBtn = document.getElementById('manualSyncBtn');


// --- Bathroom Pass Page Specific Functions ---

/**
 * Updates the date and time display in the info bar every second.
 */
function startInfoBarClock() {
    setInterval(() => {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        infoBarDateTime.textContent = now.toLocaleDateString('en-US', options);
    }, 1000);
}

async function syncAppState() {
    try {
        // Fetch all live state data in parallel
        const [liveState, travelState, departingList] = await Promise.all([
            sendAuthenticatedRequest({ action: 'getLiveState' }),
            sendAuthenticatedRequest({ action: 'getTravelingStudents' }),
            sendAuthenticatedRequest({ action: 'getDepartingStudentList' })
        ]);

        if (departingList.debug) {
            console.log("--- Backend Debug Log ---");
            departingList.debug.forEach(log => console.log(log));
            console.log("-------------------------");
        }

        // --- Handle Class Changes and Pass Availability ---
        if (liveState.currentClass) {
            infoBarClass.textContent = `Class: ${liveState.currentClass}`;
        } else {
            infoBarClass.textContent = "Class: No Active Class";
        }
        
        const classHasChanged = appState.ui.currentClassPeriod !== liveState.currentClass;
        if (classHasChanged) {
            if (appState.ui.currentClassPeriod) {
                let alertMessage = "Class period changed. ";
                if (appState.passHolder) {
                    await autoSignInStudent(appState.passHolder, appState.ui.currentClassPeriod);
                    alertMessage += `${appState.passHolder} was automatically signed in. `;
                }
                if (appState.queue.length > 0) {
                    appState.queue = [];
                    updateQueueDisplay();
                    alertMessage += "The queue has been cleared.";
                }
                showSuccessAlert(alertMessage.trim());
            }
            updateStudentDropdownsForClass(liveState.currentClass);
        }
    
        appState.ui.currentClassPeriod = liveState.currentClass;
        updatePassAvailability(liveState.isEnabled);

         // --- Process Traveling and Departing Students ---
        let travelingStudentNames = [];
        if (travelState.result === 'success' && travelState.students) {
            const allTravelers = travelState.students || [];
            travelingStudentNames = allTravelers.map(student => student.Name);

            const arrivingStudents = allTravelers
                .filter(student => student.Timestamp !== "arrived")
                .map(student => student.Name);
            
            // ** NORMALIZE only the arriving students list for its dropdown **
            const normalizedArriving = arrivingStudents.map(name => normalizeName(name));
            populateDropdown('travelSignInName', normalizedArriving, DEFAULT_NAME_OPTION);
        }
        
        if (departingList.result === 'success' && departingList.students) {
            const finalDepartingList = departingList.students.filter(student => !travelingStudentNames.includes(student));

            // ** NORMALIZE only the departing students list for its dropdown **
            const normalizedDeparting = finalDepartingList.map(name => normalizeName(name));
            populateDropdown('travelSignOutName', normalizedDeparting, DEFAULT_NAME_OPTION);
        }

        // --- Update Main Dropdowns (and filter out traveling students) ---
        updateStudentDropdownsForClass(liveState.currentClass, travelingStudentNames);

    } catch (error) {
        console.error("Sync Error:", error);
        showErrorAlert("Failed to sync with server. Please check connection.");
    }
}




/**
 * It populates all student-related dropdowns based on the current class.
 * @param {string | null} currentClassName - The name of the class to populate students for.
 */
function updateStudentDropdownsForClass(currentClassName, travelingStudents = []) {
    // ** ALWAYS keep travel dropdowns enabled **
    travelSignOutName.removeAttribute("disabled");
    travelSignInName.removeAttribute("disabled");

    if (currentClassName) {
        // Get the roster for the current class
        const namesForCourseSet = new Set();
        appState.data.allNamesFromSheet.forEach(item => {
            if (item && item.Class === currentClassName && item.Name) {
                namesForCourseSet.add(item.Name);
            }
        });
        let sortedNames = Array.from(namesForCourseSet).sort();

        // ** Filter out students who are currently on the travel sheet **
        sortedNames = sortedNames.filter(name => !travelingStudents.includes(name));

        // Populate class-specific dropdowns
        populateDropdown('nameDropdown', sortedNames, DEFAULT_NAME_OPTION);
        populateDropdown('nameQueue', sortedNames, DEFAULT_NAME_OPTION);
        populateDropdown('lateNameDropdown', sortedNames, DEFAULT_NAME_OPTION);

        // Enable the dropdowns
        nameDropdown.removeAttribute("disabled");
        lateNameDropdown.removeAttribute("disabled");
        nameQueueDropdown.removeAttribute("disabled");
        emojiDropdown.removeAttribute("disabled");
    } else {
        // If there's no class, disable the class-specific dropdowns
        const dropdownsToDisable = ['nameDropdown', 'nameQueue', 'lateNameDropdown'];
        dropdownsToDisable.forEach(id => {
            const dd = document.getElementById(id);
            populateDropdown(id, [], DEFAULT_NAME_OPTION, DEFAULT_NAME_OPTION);
            dd.setAttribute("disabled", "disabled");
        });
        emojiDropdown.setAttribute("disabled", "disabled");
    }
    
    handleNameSelectionChange();
    handleLateNameSelectionChange();
    handleTravelSignOutChange();
}

/**
 * Central function to manage the state of the queue dropdown and buttons.
 */
function updateQueueControls() {
    const isClassSelected = !!appState.ui.currentClassPeriod;
    const isPassInUse = appState.passHolder || appState.queue.length > 0;

    if (isClassSelected && (!appState.ui.isPassEnabled || isPassInUse)) {
        nameQueueDropdown.removeAttribute("disabled");
    } else {
        nameQueueDropdown.setAttribute("disabled", "disabled");
    }

    toggleAddToQueueButtonVisibility();
}

/**
 * Updates the UI to reflect whether the pass system is enabled or disabled.
 * @param {boolean} isEnabled - The current status of the pass system.
 */
function updatePassAvailability(isEnabled) {
    const previousState = appState.ui.isPassEnabled;
    appState.ui.isPassEnabled = isEnabled;

    if (appState.passHolder) {
        return; 
    }

    if (isEnabled) {
        formDisabledOverlay.classList.add('hidden');
        mainForm.classList.remove('opacity-50', 'pointer-events-none');
        studentOutHeader.classList.remove('bg-gray-500');

        if (!previousState && isEnabled && appState.queue.length > 0) {
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
    
    updateQueueControls();
}

/**
 * A helper function to contain the data loading logic.
 */
async function loadInitialPassData() {
    try {
        await fetchAllStudentData(); 
        populateCourseDropdownFromData();
        appState.ui.isDataLoaded = true;
    } catch (error) {
        console.error("Failed to load initial pass data:", error);
        showErrorAlert("Could not load class data. Please reload the page.");
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

    emojiDropdown.removeAttribute("disabled");
    mainForm.style.backgroundColor = FORM_COLOR_AVAILABLE;
}

/**
 * Prepares the main pass UI for the next student in the queue.
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
 */
async function autoSignInStudent(studentName, className) {
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
        await sendAuthenticatedRequest(payload);
        resetMainPassUI();
        appState.passHolder = null;
        setPassToAvailableState();
    } catch (error) {
        console.error('Error during auto sign-in:', error);
        showErrorAlert(`Failed to automatically sign in ${studentName}: ${error.message}`);
    }
}


/**
 * Handles the main Bathroom Pass sign-in form submission.
 */
async function handleMainFormSubmit(event) {
    event.preventDefault();
    
    signInButton.disabled = true;
    signInButton.classList.add('opacity-50', 'cursor-not-allowed');
    signInButton.textContent = "Processing...";
    
    clearInterval(appState.timer.intervalId); 

    const nameOnly = appState.passHolder.includes("(") ? appState.passHolder.substring(0, appState.passHolder.indexOf("(")-1).trim() : appState.passHolder.trim();
    const classValue = appState.ui.currentClassPeriod;
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

            if (!appState.ui.isPassEnabled) {
                updatePassAvailability(false);
            } else if (appState.queue.length > 0) {
                const nextPerson = appState.queue.shift();
                preparePassForNextInQueue(nextPerson);
            } else {
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
    const classValue = appState.ui.currentClassPeriod;

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
            handleLateNameSelectionChange();
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

async function handleTravelSignOutSubmit() {
    const selectedName = travelSignOutName.value;
    if (selectedName === "" || selectedName === DEFAULT_NAME_OPTION) {
        showErrorAlert("Please select a student to sign out for travel.");
        return;
    }

    travelSignOutSubmitBtn.disabled = true;
    travelSignOutSubmitBtn.textContent = "Processing...";

    const payload = {
        action: ACTION_LOG_TRAVEL_SIGN_OUT,
        Name: selectedName.includes("(") ? selectedName.substring(0, selectedName.indexOf("(")-1).trim() : selectedName.trim(),
        // ** START: Add current class and teacher info **
        Class: appState.ui.currentClassPeriod,
        TeacherEmail: appState.currentUser.email
        // ** END: Add current class and teacher info **
    };

    try {
        const data = await sendAuthenticatedRequest(payload);
        if (data.result === 'success') {
            showSuccessAlert(data.message);
            travelSignOutName.value = DEFAULT_NAME_OPTION;
            handleTravelSignOutChange();
        } else {
            throw new Error(data.error || 'Unknown error from server.');
        }
    } catch (error) {
        console.error('Error submitting travel sign out:', error);
        showErrorAlert(`Failed to sign out for travel: ${error.message}`);
    } finally {
        travelSignOutSubmitBtn.disabled = false;
        travelSignOutSubmitBtn.textContent = "Sign Out to Travel";
    }
}

/**
 * Handles submitting a student's arrival from a Travel Pass.
 */
async function handleTravelSignInSubmit() {
    const selectedName = travelSignInName.value;
    if (selectedName === "" || selectedName === DEFAULT_NAME_OPTION) {
        showErrorAlert("Please select a student who is arriving.");
        return;
    }

    travelSignInSubmitBtn.disabled = true;
    travelSignInSubmitBtn.textContent = "Processing...";

    const payload = {
        action: ACTION_LOG_TRAVEL_SIGN_IN,
        Name: selectedName.includes("(") ? selectedName.substring(0, selectedName.indexOf("(")-1).trim() : selectedName.trim(),
    };

    try {
        const data = await sendAuthenticatedRequest(payload);
        if (data.result === 'success') {
            showSuccessAlert(data.message);
            // Reset the arriving section
            travelSignInName.value = DEFAULT_NAME_OPTION;
            handleTravelSignInChange(); // This will hide the submit button again
        } else {
            throw new Error(data.error || 'Unknown error from server.');
        }
    } catch (error) {
        console.error('Error submitting travel sign in:', error);
        showErrorAlert(`Failed to sign in from travel: ${error.message}`);
    } finally {
        travelSignInSubmitBtn.disabled = false;
        travelSignInSubmitBtn.textContent = "Sign In from Travel";
    }
}


/**
 * Extracts a number from a name string (e.g., for sorting queue).
 */
function getNumberFromName(name) {
    const match = name.match(/\((\d+)\)$/);
    return match ? parseInt(match[1]) : Infinity;
}

/**
 * Updates the queue message display.
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
    
    if (selectedCourseName) {
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

// ** START: New Travel Pass Handlers **

/**
 * Handles changes in the Travel Pass sign-out dropdown to show/hide the submit button.
 */
function handleTravelSignOutChange() {
    const selectedName = travelSignOutName.value;
    const isNameSelected = selectedName && selectedName !== DEFAULT_NAME_OPTION;
    travelSignOutSubmitBtn.classList.toggle('hidden', !isNameSelected);
}

/**
 * Handles changes in the Travel Pass sign-in dropdown to show/hide the submit button.
 */
function handleTravelSignInChange() {
    const selectedName = travelSignInName.value;
    const isNameSelected = selectedName && selectedName !== DEFAULT_NAME_OPTION;
    travelSignInSubmitBtn.classList.toggle('hidden', !isNameSelected);
}

/**
 * Handles click on the "Departing" button in the Travel Pass tab.
 */
function handleTravelDepartingClick() {
    travelDepartingSection.classList.remove('hidden');
    travelArrivingSection.classList.add('hidden');
    // Style this button as active
    travelDepartingBtn.classList.add('border-white');
    travelArrivingBtn.classList.remove('border-white');
}

/**
 * Handles click on the "Arriving" button in the Travel Pass tab.
 */
function handleTravelArrivingClick() {
    travelArrivingSection.classList.remove('hidden');
    travelDepartingSection.classList.add('hidden');
    // Style this button as active
    travelArrivingBtn.classList.add('border-white');
    travelDepartingBtn.classList.remove('border-white');
}
// ** END: New Travel Pass Handlers **

// ** START: Updated Tab Switching Functions **

/**
 * Displays the Travel Pass view and updates button styles.
 */
function showTravelPassView() {
    travelPassArea.classList.remove('hidden');
    queueArea.classList.add('hidden');
    lateSignInView.classList.add('hidden');
    appState.ui.currentRightView = 'travel';

    // Style Travel button as active
    travelPassViewBtn.classList.add('bg-cyan-600');
    travelPassViewBtn.classList.remove('bg-cyan-500');

    // Style other buttons as inactive
    queueViewBtn.classList.add('bg-purple-400', 'text-white');
    queueViewBtn.classList.remove('bg-purple-500');
    lateSignInViewBtn.classList.add('bg-yellow-200', 'text-gray-800');
    lateSignInViewBtn.classList.remove('bg-yellow-300');
}

/**
 * Displays the queue view and updates button styles.
 */
function showQueueView() {
    queueArea.classList.remove('hidden');
    travelPassArea.classList.add('hidden');
    lateSignInView.classList.add('hidden');
    appState.ui.currentRightView = 'queue';

    // Style Queue button as active
    queueViewBtn.classList.add('bg-purple-500');
    queueViewBtn.classList.remove('bg-purple-400', 'text-white');

    // Style other buttons as inactive
    travelPassViewBtn.classList.add('bg-cyan-500');
    travelPassViewBtn.classList.remove('bg-cyan-600');
    lateSignInViewBtn.classList.add('bg-yellow-200', 'text-gray-800');
    lateSignInViewBtn.classList.remove('bg-yellow-300');
}

/**
 * Displays the late sign-in view and updates button styles.
 */
function showLateSignInView() {
    lateSignInView.classList.remove('hidden');
    travelPassArea.classList.add('hidden');
    queueArea.classList.add('hidden');
    appState.ui.currentRightView = 'lateSignIn';

    // Style Late Sign In button as active
    lateSignInViewBtn.classList.add('bg-yellow-300');
    lateSignInViewBtn.classList.remove('bg-yellow-200');

    // Style other buttons as inactive
    travelPassViewBtn.classList.add('bg-cyan-500');
    travelPassViewBtn.classList.remove('bg-cyan-600');
    queueViewBtn.classList.add('bg-purple-400', 'text-white');
    queueViewBtn.classList.remove('bg-purple-500');
}
// ** END: Updated Tab Switching Functions **


/**
 * Initializes the Bathroom Pass application elements and fetches initial data.
 */
async function initializePageSpecificApp() {
    // --- Initial UI & State Setup ---
    alertDiv.classList.add("hidden");
    errorAlertDiv.classList.add("hidden");

    studentOutNameSpan.textContent = '';
    headerStatusSpan.textContent = STATUS_PASS_AVAILABLE;
    studentOutHeader.style.backgroundColor = FORM_COLOR_AVAILABLE;
    emojiLeft.textContent = "";
    emojiRight.textContent = "";

    updateQueueDisplay(); 
    toggleAddToQueueButtonVisibility(); 

    // --- Dropdown Initialization ---
    const nameDropdownsToInit = ['nameDropdown', 'nameQueue', 'lateNameDropdown', 'travelSignOutName', 'travelSignInName'];
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

    // --- Main Data Loading and Polling Logic ---
if (appState.currentUser.email && appState.currentUser.idToken) {
        startInfoBarClock();
        infoBarTeacher.textContent = `Teacher: ${appState.currentUser.name}`;

        try {
            await loadInitialPassData();
            
            // Perform the first sync immediately on page load
            await syncAppState(); 

            // --- Set up Polling for Real-time Updates ---
            if (appState.ui.pollingIntervalId) clearInterval(appState.ui.pollingIntervalId);
            appState.ui.pollingIntervalId = setInterval(syncAppState, 9915000);

        } catch (error) {
            console.error("Failed to initialize Bathroom Pass with data:", error);
            showErrorAlert("Could not initialize the pass system. Please reload.");
            updatePassAvailability(false);
        }
    } else {
        console.warn("User not authenticated. Cannot fetch data for Bathroom Pass.");
    }
    
    showTravelPassView();
    handleTravelDepartingClick();
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
    
    const dropdownsToReset = ['nameDropdown', 'nameQueue', 'lateNameDropdown', 'travelSignOutName', 'travelSignInName'];
    dropdownsToReset.forEach(id => {
        const ddElement = document.getElementById(id);
        populateDropdown(id, [], DEFAULT_NAME_OPTION, "");
        ddElement.setAttribute("disabled", "disabled");
    });

    populateDropdown('emojiDropdown', EMOJI_LIST, NO_EMOJI_OPTION, NO_EMOJI_OPTION);
    emojiDropdown.setAttribute("disabled", "disabled"); 

    addToQueueButton.classList.add('hidden');
    removeFromQueueButton.classList.add('hidden');
    travelSignOutSubmitBtn.classList.add('hidden');
    travelSignInSubmitBtn.classList.add('hidden');

    showTravelPassView();
    updateQueueDisplay(); 
}


// --- Event Listeners ---
nameDropdown.addEventListener("change", handleNameSelectionChange);
signOutButton.addEventListener("click", startPassTimerAndTransitionUI);
mainForm.addEventListener("submit", handleMainFormSubmit); 
lateSignInForm.addEventListener('submit', handleLateSignInFormSubmit);
lateNameDropdown.addEventListener('change', handleLateNameSelectionChange);
nameQueueDropdown.addEventListener('change', toggleAddToQueueButtonVisibility);
addToQueueButton.addEventListener('click', handleAddToQueueClick);
removeFromQueueButton.addEventListener('click', handleRemoveFromQueueClick);
queueViewBtn.addEventListener("click", showQueueView);
lateSignInViewBtn.addEventListener("click", showLateSignInView);
travelPassViewBtn.addEventListener("click", showTravelPassView);

// ** START: New Travel Pass Event Listeners **
travelDepartingBtn.addEventListener('click', handleTravelDepartingClick);
travelArrivingBtn.addEventListener('click', handleTravelArrivingClick);
travelSignOutName.addEventListener('change', handleTravelSignOutChange);
travelSignInName.addEventListener('change', handleTravelSignInChange);
travelSignOutSubmitBtn.addEventListener('click', handleTravelSignOutSubmit);
travelSignInSubmitBtn.addEventListener('click', handleTravelSignInSubmit); 

// ** END: New Travel Pass Event Listeners **

manualSyncBtn.addEventListener('click', () => {
    manualSyncBtn.textContent = 'Syncing...';
    manualSyncBtn.disabled = true;

    // Use a setTimeout to allow the UI to update before the async task starts
    setTimeout(async () => {
        await syncAppState(); // Call the reusable sync function

        // A short delay provides better visual feedback
        setTimeout(() => {
            manualSyncBtn.textContent = 'Sync';
            manualSyncBtn.disabled = false;
        }, 500);
    }, 0); // A 0ms delay is all that's needed to push this to the next event cycle
});