// js/tutoring_center.js

// --- DOM Element Caching ---
let classDropdown, studentLookup, studentResults, durationInput, notesInput, tutoringForm, submitBtn, selectedStudentsList;
let masterStudentList = []; // To store the full list of students
let selectedStudents = [];  // MODIFIED: Now an array to hold multiple students

/**
 * Caches all DOM elements for the page.
 */
function cacheTutoringDOMElements() {
    classDropdown = document.getElementById('classDropdown');
    studentLookup = document.getElementById('studentLookup');
    studentResults = document.getElementById('studentResults');
    durationInput = document.getElementById('durationInput');
    notesInput = document.getElementById('notesInput');
    tutoringForm = document.getElementById('tutoringForm');
    submitBtn = document.getElementById('submitBtn');
    selectedStudentsList = document.getElementById('selectedStudentsList');
}

/**
 * Renders the list of currently selected students as "pills".
 */
function renderSelectedStudents() {
    selectedStudentsList.innerHTML = ''; // Clear the list
    selectedStudents.forEach(name => {
        const pill = document.createElement('div');
        pill.className = 'bg-blue-500 text-white text-sm font-semibold px-3 py-1 rounded-full flex items-center';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'ml-2 font-bold hover:text-red-300';
        removeBtn.type = 'button'; // Prevent form submission
        removeBtn.onclick = () => {
            selectedStudents = selectedStudents.filter(s => s !== name);
            renderSelectedStudents(); // Re-render the list
        };
        
        pill.appendChild(nameSpan);
        pill.appendChild(removeBtn);
        selectedStudentsList.appendChild(pill);
    });
}

/**
 * Renders the search results dropdown.
 */
function renderStudentResults(filteredStudents) {
    studentResults.innerHTML = '';
    if (filteredStudents.length === 0) {
        studentResults.classList.add('hidden');
        return;
    }

    filteredStudents.forEach(name => {
        const item = document.createElement('div');
        item.textContent = name;
        item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
        item.addEventListener('click', () => {
            if (!selectedStudents.includes(name)) {
                selectedStudents.push(name);
                renderSelectedStudents();
            }
            studentLookup.value = ''; // Clear the input after selection
            studentResults.classList.add('hidden');
        });
        studentResults.appendChild(item);
    });

    studentResults.classList.remove('hidden');
}

/**
 * Handles the form submission.
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const duration = parseInt(durationInput.value, 10);
    const notes = notesInput.value.trim();

    if (selectedStudents.length === 0) {
        showErrorAlert("Please select at least one student.");
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
        studentNames: selectedStudents, // MODIFIED: Send the array of names
        className: classDropdown.value,
        durationMinutes: duration,
        notes: notes,
        teacherEmail: appState.currentUser.email
    };

    try {
        const response = await sendAuthenticatedRequest(payload);
        if (response.result === 'success') {
            showSuccessAlert(`Tutoring session logged successfully for ${selectedStudents.length} student(s)!`);
            tutoringForm.reset();
            selectedStudents = [];
            renderSelectedStudents();
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
        const response = await sendAuthenticatedRequest({ action: 'getStudentMasterList' });
        if (response.result === 'success' && response.students) {
            masterStudentList = response.students.sort();
            submitBtn.disabled = false;
        } else {
            throw new Error("Could not load master student list.");
        }
        
        await fetchAllStudentData();
        populateCourseDropdownFromData();
        populateDropdown('classDropdown', appState.data.courses, DEFAULT_CLASS_OPTION);
        classDropdown.disabled = false;

    } catch (error) {
        showErrorAlert(`Could not initialize page: ${error.message}`);
        studentLookup.placeholder = "Failed to load students...";
        studentLookup.disabled = true;
    }

    studentLookup.addEventListener('input', () => {
        const query = studentLookup.value.toLowerCase();
        selectedStudentName = ''; // Clear single selection when user types
        if (query.length === 0) {
            studentResults.classList.add('hidden');
            return;
        }
        const filtered = masterStudentList.filter(name => name.toLowerCase().includes(query) && !selectedStudents.includes(name));
        renderStudentResults(filtered.slice(0, 10));
    });

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
    selectedStudents = [];
    if (tutoringForm) tutoringForm.reset();
    renderSelectedStudents();
    if (studentLookup) studentLookup.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (classDropdown) {
        populateDropdown('classDropdown', [], DEFAULT_CLASS_OPTION);
        classDropdown.disabled = true;
    }
}