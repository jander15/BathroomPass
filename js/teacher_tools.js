// js/teacher_tools.js

// --- DOM Element Caching ---
const classDropdown = document.getElementById('classDropdown');
const rowsInput = document.getElementById('rowsInput');
const colsInput = document.getElementById('colsInput');
const generateChartBtn = document.getElementById('generateChartBtn');
const chartMessage = document.getElementById('chartMessage');
const seatingChartGrid = document.getElementById('seatingChartGrid');

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

/**
 * Generates and displays the randomized seating chart.
 */
function generateSeatingChart() {
    const selectedClass = classDropdown.value;
    const rows = parseInt(rowsInput.value, 10);
    const cols = parseInt(colsInput.value, 10);

    if (!selectedClass || selectedClass === DEFAULT_CLASS_OPTION) {
        chartMessage.textContent = "Please select a class first.";
        seatingChartGrid.innerHTML = '';
        return;
    }
    if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) {
        chartMessage.textContent = "Please enter valid numbers for rows and columns.";
        seatingChartGrid.innerHTML = '';
        return;
    }

    // Get the list of students for the selected class
    const students = appState.data.allNamesFromSheet
        .filter(student => student.Class === selectedClass)
        .map(student => normalizeName(student.Name));

    // Shuffle the student list
    shuffleArray(students);

    // Prepare the grid for display
    chartMessage.textContent = `Seating Chart for ${selectedClass} (${students.length} students)`;
    seatingChartGrid.innerHTML = '';
    seatingChartGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    const totalSeats = rows * cols;

    // Create and append each seat to the grid
    for (let i = 0; i < totalSeats; i++) {
        const seat = document.createElement('div');
        seat.className = 'bg-white p-2 border border-gray-300 rounded-md shadow-sm text-center text-sm flex items-center justify-center min-h-[60px]';
        
        // Assign a student to the seat if available
        if (i < students.length) {
            seat.textContent = students[i];
            seat.classList.add('font-semibold');
        } else {
            seat.textContent = "(Empty)";
            seat.classList.add('text-gray-400', 'italic');
        }
        seatingChartGrid.appendChild(seat);
    }
}

/**
 * Initializes the Teacher Tools page after the user is authenticated.
 */
async function initializePageSpecificApp() {
    // Disable button until data is loaded
    generateChartBtn.disabled = true;

    // Attach event listener to the generate button
    generateChartBtn.addEventListener('click', generateSeatingChart);

    // Load all class and student data from the backend
    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            await fetchAllStudentData();
            populateCourseDropdownFromData();

            // Populate the class dropdown with the fetched data
            populateDropdown('classDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            classDropdown.removeAttribute("disabled");
            
            // Enable the generate button now that data is loaded
            generateChartBtn.disabled = false;

        } catch (error) {
            console.error("Failed to initialize Teacher Tools with data:", error);
            showErrorAlert("Could not load class data. Please reload.");
            chartMessage.textContent = "Error: Could not load class data.";
        }
    } else {
        console.warn("User not authenticated.");
    }
}

/**
 * Resets the page state when the user signs out.
 */
function resetPageSpecificAppState() {
    // Clear the class dropdown and disable it
    populateDropdown('classDropdown', [], DEFAULT_CLASS_OPTION, "");
    classDropdown.setAttribute("disabled", "disabled");

    // Reset the grid and message
    seatingChartGrid.innerHTML = '';
    chartMessage.textContent = "Select a class and click \"Generate Chart\" to create a seating arrangement.";
    generateChartBtn.disabled = true;
}
