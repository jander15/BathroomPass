// js/tutoring_center.js

// --- DOM Element Caching ---
let classDropdown, studentLookup, studentResults, durationInput, notesInput, tutoringForm, submitBtn;
let masterStudentList = []; // To store the full list of students
let selectedStudentName = ''; // To store the chosen student

/**
 * Caches all DOM elements specific to the Tutoring Center page.
 */
function cacheTutoringDOMElements() {
    classDropdown = document.getElementById('classDropdown');
    studentLookup = document.getElementById('studentLookup');
    studentResults = document.getElementById('studentResults');
    durationInput = document.getElementById('durationInput');
    notesInput = document.getElementById('notesInput');
    tutoringForm = document.getElementById('tutoringForm');
    submitBtn = document.getElementById('submitBtn');
}

/**
 * Renders the filtered list of students based on the user's input.
 * @param {string[]} filteredStudents - The array of student names to display.
 */
function renderStudentResults(filteredStudents) {
    studentResults.innerHTML = ''; // Clear previous results
    if (filteredStudents.length === 0) {
        studentResults.classList.add('hidden');
        return;
    }

    filteredStudents.forEach(name => {
        const item = document.createElement('div');
        item.textContent = name;
        item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
        item.addEventListener('click', () => {
            studentLookup.value = name;
            selectedStudentName = name;
            studentResults.classList.add('hidden');
        });
        studentResults.appendChild(item);
    });

    studentResults.classList.remove('hidden');
}

/**
 * Handles the form submission for logging a tutoring session.
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const duration = parseInt(durationInput.value, 10);
    const notes = notesInput.value.trim();

    if (!selectedStudentName) {
        showErrorAlert("Please select a student from the list.");
        return;
    }
    if (isNaN(duration) || duration <= 0) {
        showErrorAlert("Please enter a valid number of minutes.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging...";
    submitBtn.classList.add('opacity-50');

    const payload = {
        action: 'logTutoringSession',
        studentName: selectedStudentName,
        className: classDropdown.value,
        durationMinutes: duration,
        notes: notes,
        teacherEmail: appState.currentUser.email
    };

    try {
        const response = await sendAuthenticatedRequest(payload);
        if (response.result === 'success') {
            showSuccessAlert("Tutoring session logged successfully!");
            tutoringForm.reset(); // Resets all form fields
            selectedStudentName = ''; // Clear the selected name
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        showErrorAlert(`Error: ${error.message}`);
    } finally {
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
    submitBtn.disabled = true;

    try {
        // Fetch the master student list from the backend
        const response = await sendAuthenticatedRequest({ action: 'getStudentMasterList' });
        if (response.result === 'success' && response.students) {
            masterStudentList = response.students.sort();
            submitBtn.disabled = false;
        } else {
            throw new Error("Could not load master student list.");
        }
        
        // Fetch class data for the class dropdown
        await fetchAllStudentData();
        populateCourseDropdownFromData();
        populateDropdown('classDropdown', appState.data.courses, DEFAULT_CLASS_OPTION);
        classDropdown.disabled = false;

    } catch (error) {
        showErrorAlert(`Could not initialize page: ${error.message}`);
        studentLookup.placeholder = "Failed to load students...";
        studentLookup.disabled = true;
    }

    // Event listener for the lookup input
    studentLookup.addEventListener('input', () => {
        const query = studentLookup.value.toLowerCase();
        if (query.length === 0) {
            studentResults.classList.add('hidden');
            return;
        }
        const filtered = masterStudentList.filter(name => name.toLowerCase().includes(query));
        renderStudentResults(filtered.slice(0, 10)); // Show max 10 results
    });

    // Close results when clicking outside
    document.addEventListener('click', (event) => {
        if (!studentLookup.contains(event.target)) {
            studentResults.classList.add('hidden');
        }
    });
    
    tutoringForm.addEventListener('submit', handleFormSubmit);
}

/**
 * Resets the page state when the user signs out.
 */
function resetPageSpecificAppState() {
    masterStudentList = [];
    selectedStudentName = '';
    if (tutoringForm) tutoringForm.reset();
    if (studentLookup) studentLookup.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (classDropdown) {
        populateDropdown('classDropdown', [], DEFAULT_CLASS_OPTION);
        classDropdown.disabled = true;
    }
}