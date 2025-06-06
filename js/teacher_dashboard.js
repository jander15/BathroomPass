// js/teacher_dashboard.js

// --- DOM Element References (Declared, but assigned in cacheTeacherDashboardDOMElements) ---
let dashboardClassDropdown;

// Tab Buttons
let attendanceReportTabBtn;
let signOutHistoryTabBtn;

// Tab Content Divs
let attendanceReportTabContent;
let signOutHistoryTabContent;

// Tab 1: Attendance Report elements (Simplified for initial implementation)
let attendanceReportMessageP;
let attendanceReportTable;
let attendanceReportTableBody;
let generateAttendanceReportBtn; // Moved here for clarity

// Tab 2: Sign Out History elements
let signOutHistoryDateFilterType;
let signOutHistorySpecificDateInputDiv;
let signOutHistoryReportDateInput;
let signOutHistoryDateRangeInputsDiv;
let signOutHistoryStartDateInput;
let signOutHistoryEndDateInput;
let filterLongDurationsCheckbox; 
let generateSignOutHistoryBtn;
let signOutHistoryReportMessageP;
let signOutHistoryReportTable;
let signOutHistoryReportTableBody;


/**
 * Caches DOM elements specific to the Teacher Dashboard page.
 * This should be called only after DOMContentLoaded.
 */
function cacheTeacherDashboardDOMElements() {
    dashboardClassDropdown = document.getElementById('dashboardClassDropdown');

    attendanceReportTabBtn = document.getElementById('attendanceReportTabBtn');
    signOutHistoryTabBtn = document.getElementById('signOutHistoryTabBtn');

    attendanceReportTabContent = document.getElementById('attendanceReportTabContent');
    signOutHistoryTabContent = document.getElementById('signOutHistoryTabContent');

    // Attendance Report elements
    attendanceReportMessageP = document.getElementById('attendanceReportMessage');
    attendanceReportTable = document.getElementById('attendanceReportTable');
    attendanceReportTableBody = document.getElementById('attendanceReportTableBody');
    generateAttendanceReportBtn = document.getElementById('generateAttendanceReportBtn');

    // Sign Out History elements
    signOutHistoryDateFilterType = document.getElementById('signOutHistoryDateFilterType');
    signOutHistorySpecificDateInputDiv = document.getElementById('signOutHistorySpecificDateInput');
    signOutHistoryReportDateInput = document.getElementById('signOutHistoryReportDate');
    signOutHistoryDateRangeInputsDiv = document.getElementById('signOutHistoryDateRangeInputs');
    signOutHistoryStartDateInput = document.getElementById('signOutHistoryStartDate');
    signOutHistoryEndDateInput = document.getElementById('signOutHistoryEndDate');
    filterLongDurationsCheckbox = document.getElementById('filterLongDurations'); 
    generateSignOutHistoryBtn = document.getElementById('generateSignOutHistoryBtn');
    signOutHistoryReportMessageP = document.getElementById('signOutHistoryReportMessage');
    signOutHistoryReportTable = document.getElementById('signOutHistoryReportTable');
    signOutHistoryReportTableBody = document.getElementById('signOutHistoryReportTableBody');
}


// --- Dashboard Page Specific Functions ---

/**
 * Shows a specific dashboard tab and updates button styles.
 * @param {string} tabId - The ID of the tab content div to show (e.g., 'attendanceReportTabContent').
 */
function showDashboardTab(tabId) {
    // Hide all tab contents
    attendanceReportTabContent.classList.add('hidden');
    signOutHistoryTabContent.classList.add('hidden');

    // Reset all tab button styles to inactive
    attendanceReportTabBtn.classList.remove('bg-blue-600', 'text-white');
    attendanceReportTabBtn.classList.add('bg-gray-200', 'text-gray-800');
    signOutHistoryTabBtn.classList.remove('bg-blue-600', 'text-white');
    signOutHistoryTabBtn.classList.add('bg-gray-200', 'text-gray-800');

    // Show the selected tab content and set its button to active style
    if (tabId === 'attendanceReportTabContent') {
        attendanceReportTabContent.classList.remove('hidden');
        attendanceReportTabBtn.classList.add('bg-blue-600', 'text-white');
        attendanceReportTabBtn.classList.remove('bg-gray-200', 'text-gray-800');
    } else if (tabId === 'signOutHistoryTabContent') {
        signOutHistoryTabContent.classList.remove('hidden');
        signOutHistoryTabBtn.classList.add('bg-blue-600', 'text-white');
        signOutHistoryTabBtn.classList.remove('bg-gray-200', 'text-gray-800');
    }
    // Store current active tab for reset purposes
    appState.ui.currentDashboardTab = tabId;
}

/**
 * Generates today's date in YYYY-MM-DD format.
 * @returns {string} Current date string.
 */
function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

/**
 * Formats a Date object to MM/DD/YYYY.
 * @param {Date|string} dateInput - The Date object or date string.
 * @returns {string} Formatted date string.
 */
function formatDate(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Formats a Date object to HH:MM:SS.
 * @param {Date|string} dateInput - The Date object or date string.
 * @returns {string} Formatted time string.
 */
function formatTime(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

/**
 * Converts seconds to MM:SS format.
 * @param {number} totalSeconds - Total seconds.
 * @returns {string} Formatted time string (MM:SS).
 */
function formatDuration(totalSeconds) {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) return 'N/A';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Renders the Attendance Report table with all students in the selected class (roster view).
 * @param {string} selectedClass - The currently selected class name.
 */
function renderAttendanceReport(selectedClass) {
    attendanceReportTableBody.innerHTML = '';
    attendanceReportTable.classList.remove('hidden');
    attendanceReportMessageP.classList.add('hidden');

    // Filter appState.data.allNamesFromSheet for students in the currently selected class
    const studentsInSelectedClass = appState.data.allNamesFromSheet.filter(student => 
        student.Class === selectedClass 
    ).map(student => student.Name).sort(); // Get unique names and sort

    if (studentsInSelectedClass.length === 0) {
        attendanceReportMessageP.textContent = `No students found in the selected class: ${selectedClass}.`;
        attendanceReportTable.classList.add('hidden');
        attendanceReportMessageP.classList.remove('hidden'); // Ensure message is visible
        return;
    }

    studentsInSelectedClass.forEach(studentName => {
        const tr = document.createElement('tr');
        tr.classList.add('report-table-row'); 
        tr.innerHTML = `
            <td class="py-2 px-4 border-b">${studentName}</td>
            <td class="py-2 px-4 border-b"></td>
            <td class="py-2 px-4 border-b"></td>
            <td class="py-2 px-4 border-b"></td>
        `;
        attendanceReportTableBody.appendChild(tr);
    });

    attendanceReportMessageP.textContent = `Roster for ${selectedClass} loaded successfully.`;
    attendanceReportMessageP.classList.remove('hidden'); // Ensure message is visible
}


/**
 * Generates the Attendance Report. (Currently just shows class roster)
 */
async function generateAttendanceReport() {
    attendanceReportMessageP.textContent = "Loading Roster...";
    attendanceReportTable.classList.add('hidden');
    attendanceReportTableBody.innerHTML = '';
    showErrorAlert(''); 
    showSuccessAlert(''); 

    const selectedClass = dashboardClassDropdown.value;

    if (selectedClass === "" || selectedClass === DEFAULT_CLASS_OPTION) {
        showErrorAlert("Please select a class to generate the report.");
        attendanceReportMessageP.textContent = "Select a class, then click 'Generate Report'.";
        return;
    }

    generateAttendanceReportBtn.disabled = true;
    generateAttendanceReportBtn.classList.add('opacity-50', 'cursor-not-allowed');
    generateAttendanceReportBtn.textContent = "Loading Roster...";

    try {
        // No backend call needed for simple roster if allNamesFromSheet is already populated
        renderAttendanceReport(selectedClass);
        
    } catch (error) { // Catch block for consistency, though less likely now
        console.error('Error generating attendance roster:', error);
        showErrorAlert("Failed to generate roster. Please try again.");
        attendanceReportMessageP.textContent = "Failed to generate roster. Please try again.";
    } finally {
        generateAttendanceReportBtn.disabled = false;
        generateAttendanceReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        generateAttendanceReportBtn.textContent = "Generate Report";
    }
}


/**
 * Toggles the visibility of date input fields for Sign Out History based on the selected filter type.
 */
function toggleSignOutHistoryDateInputs() {
    const selectedFilter = signOutHistoryDateFilterType.value;
    signOutHistorySpecificDateInputDiv.classList.add('hidden');
    signOutHistoryDateRangeInputsDiv.classList.add('hidden');

    if (selectedFilter === 'specificDate') {
        signOutHistorySpecificDateInputDiv.classList.remove('hidden');
    } else if (selectedFilter === 'dateRange') {
        signOutHistoryDateRangeInputsDiv.classList.remove('hidden');
    }
}

/**
 * Applies the duration filter (show only > 5 minutes) to the Sign Out History report table rows.
 * This is done client-side after the report is fetched.
 */
function applySignOutHistoryDurationFilter() {
    const showLongDurationsOnly = filterLongDurationsCheckbox.checked;
    const thresholdSeconds = TARDY_THRESHOLD_MINUTES * 60; // 5 minutes in seconds

    Array.from(signOutHistoryReportTableBody.rows).forEach(row => {
        const typeCell = row.cells[3]; // 'Type' column
        const durationCell = row.cells[4]; // 'Duration (s)' column

        let isLongDuration = false;
        let isSignOut = typeCell.textContent === "Sign Out";

        if (isSignOut && durationCell.textContent !== "N/A") {
            let totalSeconds = 0;
            if (durationCell.textContent.includes(':')) {
                const parts = durationCell.textContent.split(':');
                totalSeconds = parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
            } else {
                totalSeconds = parseFloat(durationCell.textContent || '0');
            }
            isLongDuration = totalSeconds > thresholdSeconds;
        }

        // Apply red background highlighting
        if (isSignOut && isLongDuration) {
            row.classList.add('bg-red-200'); // Apply highlight for long durations
        } else {
            row.classList.remove('bg-red-200'); // Remove highlight otherwise
        }

        // Hide/show based on filter checkbox
        if (showLongDurationsOnly) {
            if (isSignOut && isLongDuration) {
                row.classList.remove('hidden'); // Show if it's a long sign-out
            } else {
                row.classList.add('hidden'); // Hide if it's not
            }
        } else {
            row.classList.remove('hidden'); // Show all rows if filter is off
        }
    });
}

/**
 * Generates and displays the Sign Out History report. (Existing functionality, adapted for tab)
 */
async function generateSignOutHistoryReport() {
    signOutHistoryReportMessageP.textContent = "Generating report...";
    signOutHistoryReportTable.classList.add('hidden');
    signOutHistoryReportTableBody.innerHTML = '';
    showErrorAlert(''); 
    showSuccessAlert(''); 

    const selectedClass = dashboardClassDropdown.value;
    const filterType = signOutHistoryDateFilterType.value;
    let startDate = null;
    let endDate = null;

    if (selectedClass === "" || selectedClass === DEFAULT_CLASS_OPTION) {
        showErrorAlert("Please select a class to generate the report.");
        signOutHistoryReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
        return;
    }

    if (filterType === 'today') {
        const today = getTodayDateString();
        startDate = today;
        endDate = today;
    } else if (filterType === 'specificDate') {
        startDate = signOutHistoryReportDateInput.value;
        endDate = signOutHistoryReportDateInput.value;
        if (!startDate) {
            showErrorAlert("Please select a specific date.");
            signOutHistoryReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
            return;
        }
    } else if (filterType === 'dateRange') {
        startDate = signOutHistoryStartDateInput.value;
        endDate = signOutHistoryEndDateInput.value;
        if (!startDate || !endDate) {
            showErrorAlert("Please select both start and end dates for the range.");
            signOutHistoryReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            showErrorAlert("Start date cannot be after end date.");
            signOutHistoryReportMessageP.textContent = "Start date cannot be after end date.";
            return;
        }
    }

    generateSignOutHistoryBtn.disabled = true;
    generateSignOutHistoryBtn.classList.add('opacity-50', 'cursor-not-allowed');
    generateSignOutHistoryBtn.textContent = "Loading Report...";

    try {
        const payload = {
            action: ACTION_GET_REPORT_DATA, // Use this action, backend returns all data for range
            class: selectedClass,
            startDate: startDate,
            endDate: endDate,
            userEmail: appState.currentUser.email
        };

        const data = await sendAuthenticatedRequest(payload);

        if (data.result === 'success' && Array.isArray(data.report)) {
            appState.data.currentSignOutHistoryRawData = data.report; // Store the raw, unfiltered report data

            if (appState.data.currentSignOutHistoryRawData.length === 0) {
                signOutHistoryReportMessageP.textContent = `No sign-out data found for ${selectedClass} within the selected date range.`;
                signOutHistoryReportTable.classList.add('hidden');
            } else {
                signOutHistoryReportMessageP.classList.add('hidden');
                signOutHistoryReportTable.classList.remove('hidden');
                
                signOutHistoryReportTableBody.innerHTML = ''; 

                appState.data.currentSignOutHistoryRawData.forEach(row => {
                    const tr = document.createElement('tr');
                    let type = "Sign Out";
                    let durationDisplay = row.Seconds;

                    if (row.Seconds === "Late Sign In") {
                        type = "Late Sign In";
                        durationDisplay = "N/A";
                    } else if (typeof row.Seconds === 'number') {
                        durationDisplay = formatDuration(row.Seconds);
                    }

                    tr.innerHTML = `
                        <td class="py-2 px-4 border-b">${formatDate(row.Date)}</td>
                        <td class="py-2 px-4 border-b">${formatTime(row.Date)}</td>
                        <td class="py-2 px-4 border-b">${row.Name || 'N/A'}</td>
                        <td class="py-2 px-4 border-b">${type}</td>
                        <td class="py-2 px-4 border-b">${durationDisplay}</td>
                    `;
                    signOutHistoryReportTableBody.appendChild(tr);
                });
                
                applySignOutHistoryDurationFilter(); // Apply the filter after all rows are rendered
            }
        } else {
            showErrorAlert(`Error generating report: ${data.error || 'Unknown error'}`);
            signOutHistoryReportMessageP.textContent = "Failed to generate report. Please try again or check console for details.";
        }
    } catch (error) {
        console.error('Error fetching report data:', error);
        showErrorAlert("Failed to generate report. Network or authentication issue. Please ensure you are signed in.");
        signOutHistoryReportMessageP.textContent = "Failed to generate report. Please try again or check console for details.";
    } finally {
        generateSignOutHistoryBtn.disabled = false;
        generateSignOutHistoryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        generateSignOutHistoryBtn.textContent = "Generate Report";
    }
}


/**
 * Initializes the Teacher Dashboard application elements and fetches initial data.
 * This is the page-specific initialization called by common.js.
 */
async function initializePageSpecificApp() {
    // Cache specific DOM elements for this page first
    cacheTeacherDashboardDOMElements();

    alertDiv.classList.add("hidden");
    errorAlertDiv.classList.add("hidden");

    populateDropdown('dashboardClassDropdown', [], LOADING_OPTION, "");
    dashboardClassDropdown.setAttribute("disabled", "disabled");

    // Initialize all date filters to 'today' and set current date strings
    const todayStr = getTodayDateString();

    // Attendance Report tab
    // Date filter elements removed for now in HTML, so no specific init for them here
    
    // Sign Out History tab
    signOutHistoryDateFilterType.value = 'today';
    toggleSignOutHistoryDateInputs();
    signOutHistoryReportDateInput.value = todayStr;
    signOutHistoryStartDateInput.value = todayStr;
    signOutHistoryEndDateInput.value = todayStr;
    filterLongDurationsCheckbox.checked = false; // Reset checkbox

    // Reset report output messages and tables for all tabs
    attendanceReportMessageP.textContent = "Select a class, then click 'Generate Report'."; 
    attendanceReportTable.classList.add('hidden');
    attendanceReportTableBody.innerHTML = '';

    signOutHistoryReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
    signOutHistoryReportTable.classList.add('hidden');
    signOutHistoryReportTableBody.innerHTML = '';
    
    // Default button states
    generateAttendanceReportBtn.disabled = false;
    generateAttendanceReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateAttendanceReportBtn.textContent = "Generate Report";

    generateSignOutHistoryBtn.disabled = false;
    generateSignOutHistoryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateSignOutHistoryBtn.textContent = "Generate Report";


    console.log("initializePageSpecificApp (Dashboard): Current user state:", appState.currentUser);

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            console.log("initializePageSpecificApp (Dashboard): Fetching all student data...");
            await fetchAllStudentData(); // common.js function to get all student data (which includes classes)
            console.log("initializePageSpecificApp (Dashboard): appState.data.allNamesFromSheet:", appState.data.allNamesFromSheet);
            
            // Populate main class dropdown for dashboard
            populateCourseDropdownFromData(); // This function is in common.js and populates appState.data.courses
            populateDropdown('dashboardClassDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            dashboardClassDropdown.removeAttribute("disabled");
            
            // Trigger change event on dashboardClassDropdown if a class is pre-selected,
            // to ensure initial roster is loaded and messages are cleared.
            if (dashboardClassDropdown.value !== "" && dashboardClassDropdown.value !== DEFAULT_CLASS_OPTION) {
                const event = new Event('change');
                dashboardClassDropdown.dispatchEvent(event);
            } else {
                // If no class is selected by default, ensure attendance report message is set
                attendanceReportMessageP.textContent = "Select a class, then click 'Generate Report'.";
                attendanceReportTable.classList.add('hidden');
            }

            // Set default tab to Attendance Report
            showDashboardTab('attendanceReportTabContent');

        } catch (error) {
            console.error("Failed to initialize dashboard with data:", error);
            populateDropdown('dashboardClassDropdown', [], "Error loading classes", "");
            dashboardClassDropdown.setAttribute("disabled", "disabled");
        }
    } else {
        console.warn("User not authenticated for dashboard. Cannot fetch data.");
        populateDropdown('dashboardClassDropdown', [], "Sign in to load classes", "");
        dashboardClassDropdown.setAttribute("disabled", "disabled");
    }
}

/**
 * Resets all Teacher Dashboard page specific UI and state.
 * This is the page-specific reset called by common.js on sign-out.
 */
function resetPageSpecificAppState() {
    // Reset appState.data for a clean slate
    appState.data = { allNamesFromSheet: [], courses: [], namesForSelectedCourse: [], currentSignOutHistoryRawData: [], currentAttendanceReportRawData: [] }; 

    // Reset class dropdown
    populateDropdown('dashboardClassDropdown', [], DEFAULT_CLASS_OPTION, "");
    dashboardClassDropdown.setAttribute("disabled", "disabled");

    // Reset date filters for Sign Out History tab
    signOutHistoryDateFilterType.value = 'today';
    toggleSignOutHistoryDateInputs();
    signOutHistoryReportDateInput.value = '';
    signOutHistoryStartDateInput.value = '';
    signOutHistoryEndDateInput.value = '';
    filterLongDurationsCheckbox.checked = false; // Reset checkbox

    // Clear report output for all tabs
    attendanceReportTableBody.innerHTML = '';
    attendanceReportTable.classList.add('hidden');
    attendanceReportMessageP.textContent = "Select a class, then click 'Generate Report'.";

    signOutHistoryReportTableBody.innerHTML = '';
    signOutHistoryReportTable.classList.add('hidden');
    signOutHistoryReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";

    // Reset button states
    generateAttendanceReportBtn.disabled = false;
    generateAttendanceReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateAttendanceReportBtn.textContent = "Generate Report";

    generateSignOutHistoryBtn.disabled = false;
    generateSignOutHistoryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateSignOutHistoryBtn.textContent = "Generate Report";

    // Show default tab (Attendance Report)
    showDashboardTab('attendanceReportTabContent');
}

// --- Event Listeners specific to Teacher Dashboard page (All function calls go here, after functions are defined) ---
// Tab Buttons
attendanceReportTabBtn.addEventListener('click', () => showDashboardTab('attendanceReportTabContent'));
signOutHistoryTabBtn.addEventListener('click', () => showDashboardTab('signOutHistoryTabContent'));

// Class Dropdown - Main filter for the dashboard
dashboardClassDropdown.addEventListener('change', () => {
    // When class changes, clear reports for all tabs
    attendanceReportTableBody.innerHTML = '';
    attendanceReportTable.classList.add('hidden');
    attendanceReportMessageP.textContent = "Select a class, then click 'Generate Report'."; // Simpler message for Attendance

    signOutHistoryReportTableBody.innerHTML = '';
    signOutHistoryReportTable.classList.add('hidden');
    signOutHistoryReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'."; // Full message for Sign Out History
});


// Tab 1: Attendance Report Listeners
generateAttendanceReportBtn.addEventListener('click', generateAttendanceReport);


// Tab 2: Sign Out History Listeners
signOutHistoryDateFilterType.addEventListener('change', toggleSignOutHistoryDateInputs);
generateSignOutHistoryBtn.addEventListener('click', generateSignOutHistoryReport);
filterLongDurationsCheckbox.addEventListener('change', applySignOutHistoryDurationFilter);


// Call initGoogleSignIn on DOM load for this specific page.
// This is handled by common.js, which has a central DOMContentLoaded listener
// and calls initGoogleSignIn. initGoogleSignIn then calls initializePageSpecificApp.
// This file does not need its own DOMContentLoaded listener anymore.
// document.addEventListener('DOMContentLoaded', initGoogleSignIn);
