// js/teacher_tools.js

// --- DOM Element Caching ---
const classDropdown = document.getElementById('classDropdown');
const chartMessage = document.getElementById('chartMessage');
const seatingChartGrid = document.getElementById('seatingChartGrid');

// New dynamic controls
const generateIndividualsBtn = document.getElementById('generateIndividualsBtn');
const groupSizeInput = document.getElementById('groupSizeInput');
const generateGroupsBtn = document.getElementById('generateGroupsBtn');

// --- State Management ---
let firstSelectedTile = null;
let activeMode = 'individuals'; // 'individuals' or 'groups'

// --- Color Palette for Groups ---
const groupColors = [
    '#fecaca', '#fed7aa', '#fef08a', '#d9f99d', '#bfdbfe', '#e9d5ff', '#fbcfe8',
    '#fca5a5', '#fdba74', '#fde047', '#bef264', '#93c5fd', '#d8b4fe', '#f9a8d4'
];

// --- Interactivity Functions (Drag/Drop, Click-to-Swap) ---
function swapTiles(tile1, tile2) {
    // Swap text content
    const tempText = tile1.textContent;
    tile1.textContent = tile2.textContent;
    tile2.textContent = tempText;

    // Swap background color
    const tempColor = tile1.style.backgroundColor;
    tile1.style.backgroundColor = tile2.style.backgroundColor;
    tile2.style.backgroundColor = tempColor;

    // Swap classes for empty/non-empty status
    const tile1IsEmpty = tile1.classList.contains('text-gray-400');
    const tile2IsEmpty = tile2.classList.contains('text-gray-400');

    if (tile1IsEmpty !== tile2IsEmpty) {
        tile1.classList.toggle('text-gray-400');
        tile1.classList.toggle('italic');
        tile1.classList.toggle('font-semibold');
        
        tile2.classList.toggle('text-gray-400');
        tile2.classList.toggle('italic');
        tile2.classList.toggle('font-semibold');
    }
}
function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.id);
}
function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}
function handleDragOver(e) {
    e.preventDefault();
    if (e.target.classList.contains('seat')) {
        e.target.classList.add('over');
    }
}
function handleDragLeave(e) {
    if (e.target.classList.contains('seat')) {
        e.target.classList.remove('over');
    }
}
function handleDrop(e) {
    e.preventDefault();
    e.target.classList.remove('over');
    const draggedItemId = e.dataTransfer.getData('text/plain');
    const draggedItem = document.getElementById(draggedItemId);
    const dropTarget = e.target.closest('.seat');
    if (draggedItem && dropTarget && draggedItem !== dropTarget) {
        swapTiles(draggedItem, dropTarget);
    }
}
function handleTileClick(e) {
    const clickedTile = e.currentTarget;
    if (!firstSelectedTile) {
        firstSelectedTile = clickedTile;
        firstSelectedTile.classList.add('selected');
    } else if (firstSelectedTile === clickedTile) {
        firstSelectedTile.classList.remove('selected');
        firstSelectedTile = null;
    } else {
        swapTiles(firstSelectedTile, clickedTile);
        firstSelectedTile.classList.remove('selected');
        firstSelectedTile = null;
    }
}

/**
 * Updates the visual state of the generation buttons.
 */
function updateActiveButton() {
    if (activeMode === 'individuals') {
        generateIndividualsBtn.classList.add('active', 'bg-blue-700');
        generateGroupsBtn.classList.remove('active', 'bg-blue-700');
    } else {
        generateIndividualsBtn.classList.remove('active', 'bg-blue-700');
        generateGroupsBtn.classList.add('active', 'bg-blue-700', 'text-white');
    }
}

/**
 * Shuffles an array in place.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * UPDATED: Creates student groups, ensuring no student is ever left alone.
 */
function createStudentGroups(students, groupSize) {
    const shuffledStudents = [...students];
    shuffleArray(shuffledStudents);
    
    const groups = [];
    if (shuffledStudents.length === 0 || groupSize <= 1) return [];

    // Create as many full-sized groups as possible
    while (shuffledStudents.length >= groupSize) {
        groups.push(shuffledStudents.splice(0, groupSize));
    }

    // Distribute any leftovers into the existing groups
    let groupIndex = 0;
    while (shuffledStudents.length > 0) {
        if (groups.length === 0) { // Should not happen if groupSize > 1
             groups.push([]);
        }
        groups[groupIndex % groups.length].push(shuffledStudents.pop());
        groupIndex++;
    }

    return groups;
}

/**
 * Main function to generate the chart based on the active mode.
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
    
    if (activeMode === 'individuals') {
        generateIndividualChart(students);
    } else {
        const groupSize = parseInt(groupSizeInput.value, 10);
        if (isNaN(groupSize) || groupSize < 2) {
            chartMessage.textContent = "Please enter a valid group size of 2 or more.";
            return;
        }
        generateGroupChart(students, groupSize);
    }
}

/**
 * Creates an interactive seat element with all necessary event listeners.
 */
function createInteractiveSeat(id) {
    const seat = document.createElement('div');
    seat.id = `seat-${id}`;
    seat.className = 'seat bg-white p-2 border border-gray-300 rounded-md shadow-sm text-center text-sm flex items-center justify-center min-h-[60px] cursor-pointer transition-all duration-150';
    seat.draggable = true;
    seat.addEventListener('dragstart', handleDragStart);
    seat.addEventListener('dragend', handleDragEnd);
    seat.addEventListener('dragover', handleDragOver);
    seat.addEventListener('dragleave', handleDragLeave);
    seat.addEventListener('drop', handleDrop);
    seat.addEventListener('click', handleTileClick);
    return seat;
}

/**
 * Generates an interactive chart for individuals.
 */
function generateIndividualChart(students) {
    shuffleArray(students);
    const cols = 8;
    const rows = Math.ceil(students.length / cols);
    seatingChartGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    const totalSeats = rows * cols;

    for (let i = 0; i < totalSeats; i++) {
        const seat = createInteractiveSeat(i);
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
 * UPDATED: Uses a specific horizontal placement for pairs and the
 * cluster algorithm for all other group sizes.
 */
function generateGroupChart(students, groupSize) {
    const groups = createStudentGroups(students, groupSize);
    const cols = 8;
    const grid = []; // 2D array to track occupied cells
    seatingChartGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    groups.forEach((group, groupIndex) => {
        const color = groupColors[groupIndex % groupColors.length];

        // --- START: New Logic for Pairs ---
        if (groupSize === 2) {
            let placed = false;
            for (let r = 0; !placed; r++) {
                for (let c = 0; c <= cols - 2; c++) { // Need space for 2
                    if (isSpotAvailable(grid, r, c, 2, 1)) {
                        placeGroup(grid, r, c, group, { w: 2, h: 1 }, color);
                        placed = true;
                        break;
                    }
                }
            }
        } 
        // --- END: New Logic for Pairs ---
        
        else { // Use the cluster algorithm for groups of 3+
            const groupShape = { w: 2, h: 2 }; // Default shape for larger groups
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
        }
    });

    renderGrid(grid);
}

function findNextEmptyCell(grid, cols) {
    const maxRows = grid.length + 1;
    for (let r = 0; r < maxRows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r] || !grid[r][c]) {
                return { r, c };
            }
        }
    }
    return null;
}

/**
 * Renders an interactive seating chart from the 2D grid data.
 */
function renderGrid(grid) {
    const maxRows = grid.length;
    const maxCols = grid.reduce((max, row) => Math.max(max, row ? row.length : 0), 0);
    seatingChartGrid.style.gridTemplateColumns = `repeat(${maxCols || 8}, 1fr)`;
    let seatIdCounter = 0;

    for (let r = 0; r < maxRows; r++) {
        for (let c = 0; c < maxCols; c++) {
            const cellData = grid[r] ? grid[r][c] : null;
            const seat = createInteractiveSeat(seatIdCounter++);
            
            if (cellData) {
                seat.textContent = cellData.name;
                seat.style.backgroundColor = cellData.color;
                if (cellData.name !== "(Empty)") {
                    seat.classList.add('font-semibold');
                } else {
                    seat.classList.add('text-gray-500', 'italic');
                }
            } else {
                seat.classList.add('bg-gray-100');
                seat.textContent = "(Empty)";
                seat.classList.add('text-gray-400', 'italic');
            }
            seatingChartGrid.appendChild(seat);
        }
    }
}

/**
 * Initializes the Teacher Tools page.
 */
async function initializePageSpecificApp() {
    generateIndividualsBtn.disabled = true;
    generateGroupsBtn.disabled = true;

    // --- Add Event Listeners ---
    generateIndividualsBtn.addEventListener('click', () => {
        activeMode = 'individuals';
        updateActiveButton();
        generateChart();
    });
    generateGroupsBtn.addEventListener('click', () => {
        activeMode = 'groups';
        updateActiveButton();
        generateChart();
    });
    
    classDropdown.addEventListener('change', () => {
        const selectedClass = classDropdown.value;
        if (selectedClass && selectedClass !== DEFAULT_CLASS_OPTION) {
            const studentCount = appState.data.allNamesFromSheet.filter(s => s.Class === selectedClass).length;
            groupSizeInput.max = Math.floor(studentCount / 2);
        }
        activeMode = 'individuals';
        updateActiveButton();
        generateChart();
    });

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            await fetchAllStudentData();
            populateCourseDropdownFromData();
            populateDropdown('classDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            classDropdown.removeAttribute("disabled");
            generateIndividualsBtn.disabled = false;
            generateGroupsBtn.disabled = false;
            updateActiveButton();
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
    generateIndividualsBtn.disabled = true;
    generateGroupsBtn.disabled = true;
    activeMode = 'individuals';
    updateActiveButton();
}
