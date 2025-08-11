// js/teacher_tools.js

// --- DOM Element Caching ---
const classDropdown = document.getElementById('classDropdown');
const chartMessage = document.getElementById('chartMessage');
const seatingChartGrid = document.getElementById('seatingChartGrid');

// Generation buttons
const generateIndividualsBtn = document.getElementById('generateIndividualsBtn');
const generatePairsBtn = document.getElementById('generatePairsBtn');
const generateThreesBtn = document.getElementById('generateThreesBtn');
const generateFoursBtn = document.getElementById('generateFoursBtn');
const groupBtns = [generateIndividualsBtn, generatePairsBtn, generateThreesBtn, generateFoursBtn];

// --- State Management ---
let firstSelectedTile = null;
let activeGroupSize = 0; // 0 for individuals, 2 for pairs, etc.

// --- Color Palette for Groups ---
const groupColors = [
    '#fecaca', '#fed7aa', '#fef08a', '#d9f99d', '#bfdbfe', '#e9d5ff', '#fbcfe8',
    '#fca5a5', '#fdba74', '#fde047', '#bef264', '#93c5fd', '#d8b4fe', '#f9a8d4'
];

/**
 * Updates the visual state of the generation buttons.
 * @param {number} size The group size of the button to activate.
 */
function updateActiveButton(size) {
    activeGroupSize = size;
    groupBtns.forEach(btn => {
        if (parseInt(btn.dataset.groupsize, 10) === size || (size === 0 && btn.id === 'generateIndividualsBtn')) {
            btn.classList.add('active', 'bg-blue-700', 'text-white');
            btn.classList.remove('bg-gray-200', 'text-gray-800');
        } else {
            btn.classList.remove('active', 'bg-blue-700', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-800');
        }
    });
    // Ensure the "Individuals" button has the primary blue color when active
    if (size === 0) {
        generateIndividualsBtn.classList.add('bg-blue-600');
        generateIndividualsBtn.classList.remove('bg-gray-200', 'text-gray-800');
    } else {
        generateIndividualsBtn.classList.remove('bg-blue-600');
        generateIndividualsBtn.classList.add('bg-gray-200', 'text-gray-800');
    }
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Creates student groups based on the desired size.
 * @param {string[]} students The list of student names.
 * @param {number} groupSize The target size for each group.
 * @returns {string[][]} An array of groups.
 */
function createStudentGroups(students, groupSize) {
    const shuffledStudents = [...students];
    shuffleArray(shuffledStudents);
    
    const groups = [];
    while (shuffledStudents.length >= groupSize) {
        groups.push(shuffledStudents.splice(0, groupSize));
    }

    // Handle leftovers
    if (shuffledStudents.length === 1 && groups.length > 0) {
        // Add the single leftover student to the last group
        groups[groups.length - 1].push(shuffledStudents.pop());
    } else if (shuffledStudents.length > 0) {
        // If there are 2 or 3 leftovers, they form their own final group
        groups.push(shuffledStudents);
    }

    return groups;
}

/**
 * Generates and displays the seating chart based on group size.
 */
function generateChart() {
    if (firstSelectedTile) {
        firstSelectedTile.classList.remove('selected');
        firstSelectedTile = null;
    }

    const selectedClass = classDropdown.value;
    if (!selectedClass || selectedClass === DEFAULT_CLASS_OPTION) {
        chartMessage.textContent = "Please select a class first.";
        seatingChartGrid.innerHTML = '';
        return;
    }

    const students = appState.data.allNamesFromSheet
        .filter(student => student.Class === selectedClass)
        .map(student => normalizeName(student.Name));

    chartMessage.textContent = `Seating Chart for ${selectedClass} (${students.length} students)`;
    seatingChartGrid.innerHTML = '';

    if (activeGroupSize === 0) {
        generateIndividualChart(students);
    } else {
        generateGroupChart(students, activeGroupSize);
    }
}

/**
 * Generates a standard, randomized seating chart for individuals.
 * @param {string[]} students The list of student names.
 */
function generateIndividualChart(students) {
    shuffleArray(students);
    const cols = 8; // Default columns for individual layout
    const rows = Math.ceil(students.length / cols);

    seatingChartGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    const totalSeats = rows * cols;

    for (let i = 0; i < totalSeats; i++) {
        const seat = document.createElement('div');
        seat.className = 'bg-white p-2 border border-gray-300 rounded-md shadow-sm text-center text-sm flex items-center justify-center min-h-[60px] cursor-pointer';
        
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
 * Generates a seating chart with students arranged in colored groups.
 * @param {string[]} students The list of student names.
 * @param {number} groupSize The target size for each group.
 */
function generateGroupChart(students, groupSize) {
    const groups = createStudentGroups(students, groupSize);
    const cols = 8; // A fixed width for the grid works well for auto-layout
    seatingChartGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    const grid = []; // 2D array to track occupied cells

    groups.forEach((group, groupIndex) => {
        const color = groupColors[groupIndex % groupColors.length];
        const groupShape = groupSize === 2 ? { w: 2, h: 1 } : { w: 2, h: 2 };

        // Find the next available spot for this group's shape
        let placed = false;
        for (let r = 0; !placed; r++) {
            for (let c = 0; c <= cols - groupShape.w; c++) {
                if (isSpotAvailable(grid, r, c, groupShape.w, groupShape.h)) {
                    placeGroup(grid, r, c, group, groupShape, color);
                    placed = true;
                    break;
                }
            }
        }
    });

    // Render the final grid
    renderGrid(grid);
}

/**
 * Checks if a rectangular area in the grid is empty.
 * @param {Array} grid The 2D grid array.
 * @param {number} r The starting row.
 * @param {number} c The starting column.
 * @param {number} w The width of the area to check.
 * @param {number} h The height of the area to check.
 * @returns {boolean} True if the area is available.
 */
function isSpotAvailable(grid, r, c, w, h) {
    for (let i = r; i < r + h; i++) {
        for (let j = c; j < c + w; j++) {
            if (grid[i] && grid[i][j]) {
                return false; // Spot is already taken
            }
        }
    }
    return true;
}

/**
 * Places a group's data into the 2D grid array.
 * @param {Array} grid The 2D grid array.
 * @param {number} r The starting row.
 * @param {number} c The starting column.
 * @param {string[]} group The list of students in the group.
 * @param {object} shape The shape of the group {w, h}.
 * @param {string} color The background color for the group.
 */
function placeGroup(grid, r, c, group, shape, color) {
    let studentIndex = 0;
    for (let i = r; i < r + shape.h; i++) {
        if (!grid[i]) grid[i] = [];
        for (let j = c; j < c + shape.w; j++) {
            const studentName = studentIndex < group.length ? group[studentIndex] : "(Empty)";
            grid[i][j] = { name: studentName, color: color };
            studentIndex++;
        }
    }
}

/**
 * Renders the seating chart grid from the 2D grid data.
 * @param {Array} grid The 2D grid array containing student and color info.
 */
function renderGrid(grid) {
    const maxRows = grid.length;
    const maxCols = grid.reduce((max, row) => Math.max(max, row.length), 0);
    seatingChartGrid.style.gridTemplateColumns = `repeat(${maxCols}, 1fr)`;

    for (let r = 0; r < maxRows; r++) {
        for (let c = 0; c < maxCols; c++) {
            const cellData = grid[r] ? grid[r][c] : null;
            const seat = document.createElement('div');
            seat.className = 'p-2 border border-gray-300 rounded-md shadow-sm text-center text-sm flex items-center justify-center min-h-[60px]';

            if (cellData) {
                seat.textContent = cellData.name;
                seat.style.backgroundColor = cellData.color;
                if (cellData.name !== "(Empty)") {
                    seat.classList.add('font-semibold');
                } else {
                    seat.classList.add('text-gray-500', 'italic');
                }
            } else {
                // This is an empty cell outside of any group, make it visually distinct
                seat.classList.add('bg-gray-100');
            }
            seatingChartGrid.appendChild(seat);
        }
    }
}

/**
 * Initializes the Teacher Tools page.
 */
async function initializePageSpecificApp() {
    groupBtns.forEach(btn => btn.disabled = true);

    // --- Add Event Listeners ---
    generateIndividualsBtn.addEventListener('click', () => {
        updateActiveButton(0);
        generateChart();
    });
    generatePairsBtn.addEventListener('click', () => {
        updateActiveButton(2);
        generateChart();
    });
    generateThreesBtn.addEventListener('click', () => {
        updateActiveButton(3);
        generateChart();
    });
    generateFoursBtn.addEventListener('click', () => {
        updateActiveButton(4);
        generateChart();
    });

    classDropdown.addEventListener('change', () => {
        updateActiveButton(0); // Default to individuals when class changes
        generateChart();
    });

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            await fetchAllStudentData();
            populateCourseDropdownFromData();
            populateDropdown('classDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            classDropdown.removeAttribute("disabled");
            groupBtns.forEach(btn => btn.disabled = false);
            updateActiveButton(0); // Set "Individuals" as active by default
        } catch (error) {
            console.error("Failed to initialize Teacher Tools with data:", error);
            showErrorAlert("Could not load class data. Please reload.");
            chartMessage.textContent = "Error: Could not load class data.";
        }
    }
}

/**
 * Resets the page state when the user signs out.
 */
function resetPageSpecificAppState() {
    populateDropdown('classDropdown', [], DEFAULT_CLASS_OPTION, "");
    classDropdown.setAttribute("disabled", "disabled");
    seatingChartGrid.innerHTML = '';
    chartMessage.textContent = "Select a class and click a button to generate a chart.";
    groupBtns.forEach(btn => btn.disabled = true);
    updateActiveButton(0);
}
