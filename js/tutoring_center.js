// js/tutoring_center.js

// --- DOM Element Caching ---
let studentLookup, studentResults, durationInput, notesInput, tutoringForm, submitBtn, selectedStudentsList, tutoringContent, pageHeader;
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
    tutoringContent = document.getElementById('tutoringContent');
    pageHeader = document.querySelector('#appContent h1'); 
    authorizationOverlay = document.getElementById('authorizationOverlay');

}

/**
 * Renders the list of currently selected students as "pills".
 */
function renderSelectedStudents() {
    selectedStudentsList.innerHTML = ''; // Clear the list
    selectedStudents.forEach(student => {
        const pill = document.createElement('div');
        pill.className = 'bg-blue-500 text-white text-sm font-semibold px-3 py-1 rounded-full flex items-center';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = student.StudentName;
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'ml-2 font-bold hover:text-red-300';
        removeBtn.type = 'button'; // Prevent form submission
        removeBtn.onclick = () => {
            selectedStudents = selectedStudents.filter(s => s.StudentName !== student.StudentName);
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

    filteredStudents.forEach(student => {
        const item = document.createElement('div');
        item.textContent = student.StudentName;
        item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
        item.addEventListener('click', () => {
            if (!selectedStudents.some(s => s.StudentName === student.StudentName)) {
                selectedStudents.push(student);
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
 * A function to display an access denied message.
 */
function showAccessDenied() {
    if (tutoringContent) tutoringContent.classList.add('hidden');
    if (pageHeader) pageHeader.textContent = "Access Denied";
    showErrorAlert("You are not authorized to use this tool. Please contact an administrator.");
}

/**
 * Initializes the Tutoring Center page with an authorization check.
 */
async function initializePageSpecificApp() {
    cacheTutoringDOMElements();
    
    // Hide content and disable form by default
    tutoringContent.classList.add('hidden');
    if (studentLookup) {
        studentLookup.placeholder = "Authorizing...";
        studentLookup.disabled = true;
    }
    if (submitBtn) submitBtn.disabled = true;

        try {
        // --- AUTHORIZATION CHECK ---
        const authResponse = await sendAuthenticatedRequest({ action: 'checkTutorAuthorization' });
        console.log("Authorization response from server:", authResponse);

        if (!authResponse.isAuthorized) {
            showAccessDenied();
            return; // Stop the initialization process
        }

        // If authorized, show the form and load student data.
        tutoringForm.classList.remove('hidden');
        studentLookup.placeholder = "Loading students...";
        
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
        showAccessDenied();
        console.error("Initialization or Authorization failed:", error);
    } finally {
        // This runs after the try/catch, guaranteeing the overlay is hidden.
        if (authorizationOverlay) {
            authorizationOverlay.classList.add('hidden');
        }
    }



    // Event listeners
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
        if (studentLookup && !studentLookup.contains(event.target)) {
            studentResults.classList.add('hidden');
        }
    });
    
    if (tutoringForm) tutoringForm.addEventListener('submit', handleFormSubmit);
}

/**
 * Resets the page state when the user signs out.
 */
function resetPageSpecificAppState() {
    masterStudentList = [];
    selectedStudents = [];
    if (tutoringForm) tutoringForm.reset();
    if (selectedStudentsList) renderSelectedStudents();
    if (studentLookup) {
        studentLookup.disabled = true;
        studentLookup.placeholder = "Please sign in to load students.";
    }
    if (submitBtn) submitBtn.disabled = true;
    if (pageHeader) pageHeader.textContent = "Log a Tutoring Session";
    if (tutoringContent) tutoringContent.classList.add('hidden');
}