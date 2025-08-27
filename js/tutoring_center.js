// js/tutoring_center.js

// --- DOM Element Caching ---
let classDropdown, studentDropdown, durationInput, notesInput, tutoringForm, submitBtn;

/**
 * Caches all DOM elements specific to the Tutoring Center page.
 */
function cacheTutoringDOMElements() {
    classDropdown = document.getElementById('classDropdown');
    studentDropdown = document.getElementById('studentDropdown');
    durationInput = document.getElementById('durationInput');
    notesInput = document.getElementById('notesInput');
    tutoringForm = document.getElementById('tutoringForm');
    submitBtn = document.getElementById('submitBtn');
}

/**
 * Handles the form submission for logging a tutoring session.
 * @param {Event} event - The form submission event.
 */
async function handleFormSubmit(event) {
    event.preventDefault(); // Prevent the default form submission

    // --- 1. Form Validation ---
    const studentName = studentDropdown.value;
    const duration = parseInt(durationInput.value, 10);
    const notes = notesInput.value.trim();

    if (!studentName || studentName === DEFAULT_NAME_OPTION) {
        showErrorAlert("Please select a student.");
        return;
    }
    if (isNaN(duration) || duration <= 0) {
        showErrorAlert("Please enter a valid, whole number of minutes for the duration.");
        return;
    }

    // --- 2. UI Feedback ---
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging...";
    submitBtn.classList.add('opacity-50');

    // --- 3. Prepare and Send Data ---
    const payload = {
        action: 'logTutoringSession',
        studentName: normalizeName(studentName), // Send the clean name
        className: classDropdown.value,
        durationMinutes: duration,
        notes: notes,
        teacherName: appState.currentUser.name
    };

    try {
        const response = await sendAuthenticatedRequest(payload);
        if (response.result === 'success') {
            showSuccessAlert("Tutoring session logged successfully!");
            // Reset the form
            studentDropdown.value = DEFAULT_NAME_OPTION;
            durationInput.value = '';
            notesInput.value = '';
        } else {
            throw new Error(response.error || "An unknown error occurred on the server.");
        }
    } catch (error) {
        console.error("Failed to log tutoring session:", error);
        showErrorAlert(`Error: ${error.message}`);
    } finally {
        // --- 4. Reset UI ---
        submitBtn.disabled = false;
        submitBtn.textContent = "Log Session";
        submitBtn.classList.remove('opacity-50');
    }
}

/**
 * Initializes the Tutoring Center page.
 */
async function initializePageSpecificApp() {
    cacheTutoringDOMElements();

    // Disable form elements until data is loaded
    studentDropdown.disabled = true;
    submitBtn.disabled = true;
    populateDropdown('classDropdown', [], LOADING_OPTION);
    populateDropdown('studentDropdown', [], DEFAULT_NAME_OPTION);

    try {
        // Load all student and class data
        await fetchAllStudentData();
        populateCourseDropdownFromData();

        // Populate the class dropdown
        populateDropdown('classDropdown', appState.data.courses, DEFAULT_CLASS_OPTION);
        classDropdown.disabled = false;

        // Add event listener for class selection
        classDropdown.addEventListener('change', () => {
            const selectedClass = classDropdown.value;
            if (selectedClass && selectedClass !== DEFAULT_CLASS_OPTION) {
                const studentsInClass = appState.data.allNamesFromSheet
                    .filter(s => s.Class === selectedClass)
                    .map(s => s.Name)
                    .sort();
                populateDropdown('studentDropdown', studentsInClass, DEFAULT_NAME_OPTION);
                studentDropdown.disabled = false;
                submitBtn.disabled = false;
            } else {
                populateDropdown('studentDropdown', [], DEFAULT_NAME_OPTION);
                studentDropdown.disabled = true;
                submitBtn.disabled = true;
            }
        });
        
        // Add event listener for the form
        tutoringForm.addEventListener('submit', handleFormSubmit);

    } catch (error) {
        showErrorAlert("Could not load initial data. Please refresh the page.");
    }
}

/**
 * Resets the page state when the user signs out.
 */
function resetPageSpecificAppState() {
    if (classDropdown) {
        populateDropdown('classDropdown', [], DEFAULT_CLASS_OPTION);
        classDropdown.disabled = true;
    }
    if (studentDropdown) {
        populateDropdown('studentDropdown', [], DEFAULT_NAME_OPTION);
        studentDropdown.disabled = true;
    }
    if (durationInput) durationInput.value = '';
    if (notesInput) notesInput.value = '';
    if (submitBtn) submitBtn.disabled = true;
}