// js/tutoring_center.js

// --- DOM Element Caching ---
let studentLookup, studentResults, durationInput, notesInput, tutoringForm, submitBtn, selectedStudentsList;
let masterStudentList = []; // Now stores objects: { StudentName: "...", Class: "..." }
let selectedStudents = [];  // Now stores the same objects

/**
 * Caches all DOM elements for the page.
 */
function cacheTutoringDOMElements() {
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
    selectedStudentsList.innerHTML = '';
    selectedStudents.forEach(student => {
        const pill = document.createElement('div');
        pill.className = 'bg-blue-500 text-white text-sm font-semibold px-3 py-1 rounded-full flex items-center';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = student.StudentName;
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'ml-2 font-bold hover:text-red-300';
        removeBtn.type = 'button';
        removeBtn.onclick = () => {
            selectedStudents = selectedStudents.filter(s => s.StudentName !== student.StudentName);
            renderSelectedStudents();
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

    filteredStudents.forEach(student => {
        const item = document.createElement('div');
        item.textContent = student.StudentName;
        item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
        item.addEventListener('click', () => {
            if (!selectedStudents.some(s => s.StudentName === student.StudentName)) {
                selectedStudents.push(student);
                renderSelectedStudents();
            }
            studentLookup.value = '';
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

    // Create the array of student objects for the payload
    const studentsPayload = selectedStudents.map(student => ({
        studentName: student.StudentName,
        className: student.Class
    }));

    const payload = {
        action: 'logTutoringSession',
        students: studentsPayload,
        durationMinutes: duration,
        notes: notes,
        teacherEmail: appState.currentUser.email
    };

    try {
        const response = await sendAuthenticatedRequest(payload);
        if (response.result === 'success') {
            showSuccessAlert(`Session logged for ${selectedStudents.length} student(s)!`);
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
    
    // Set initial loading state
    studentLookup.placeholder = "Loading students...";
    studentLookup.disabled = true;
    submitBtn.disabled = true;

    try {
        const response = await sendAuthenticatedRequest({ action: 'getStudentMasterList' });
        if (response.result === 'success' && response.students) {
            masterStudentList = response.students.sort((a, b) => a.StudentName.localeCompare(b.StudentName));
            
            // Update UI now that data is loaded
            studentLookup.placeholder = "Start typing a student's name...";
            studentLookup.disabled = false;
            submitBtn.disabled = false;
        } else {
            throw new Error("Could not load master student list.");
        }
    } catch (error) {
        showErrorAlert(`Could not initialize page: ${error.message}`);
        studentLookup.placeholder = "Failed to load students.";
    }

    studentLookup.addEventListener('input', () => {
        const query = studentLookup.value.toLowerCase();
        if (query.length === 0) {
            studentResults.classList.add('hidden');
            return;
        }
        const selectedNames = selectedStudents.map(s => s.StudentName);
        const filtered = masterStudentList.filter(student => 
            student.StudentName.toLowerCase().includes(query) && !selectedNames.includes(student.StudentName)
        );
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
    if (studentLookup) {
        studentLookup.disabled = true;
        studentLookup.placeholder = "Please sign in to load students.";
    }
    if (submitBtn) submitBtn.disabled = true;
}