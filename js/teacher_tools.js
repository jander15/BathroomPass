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
 * UPDATED: Swaps student names and updates colors based on the destination group.
 */
function swapTiles(tile1, tile2) {
    // Only swap the text content (the student names)
    const tempText = tile1.textContent;
    tile1.textContent = tile2.textContent;
    tile2.textContent = tempText;

    // --- START: New Color Logic ---
    // If the second tile (the destination) has a group color,
    // make the first tile adopt that color.
    if (tile2.style.backgroundColor && tile2.style.backgroundColor !== 'white') {
        tile1.style.backgroundColor = tile2.style.backgroundColor;
    } else {
        // If the destination is a neutral tile (like an empty individual seat),
        // make the moved tile neutral as well.
        tile1.style.backgroundColor = 'white';
    }
    // --- END: New Color Logic ---

    // Swap classes for empty/non-empty status
    const tile1IsEmpty = tile1.textContent === '(Empty)';
    const tile2IsEmpty = tile2.textContent === '(Empty)';

    // Update styling based on whether the tile is now empty or not
    tile1.classList.toggle('text-gray-400', tile1IsEmpty);
    tile1.classList.toggle('italic', tile1IsEmpty);
    tile1.classList.toggle('font-semibold', !tile1IsEmpty);
    
    tile2.classList.toggle('text-gray-400', tile2IsEmpty);
    tile2.classList.toggle('italic', tile2IsEmpty);
    tile2.classList.toggle('font-semibold', !tile2IsEmpty);
}

// --- Event Handlers for Drag and Drop ---
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

// --- Event Handler for Click-to-Swap ---
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
function updateActiveButton(size) {
    activeGroupSize = size;
    groupBtns.forEach(btn => {
        const btnSize = parseInt(btn.dataset.groupsize, 10);
        if (btnSize === size || (size === 0 && btn.id === 'generateIndividualsBtn')) {
            btn.classList.add('active', 'bg-blue-700', 'text-white');
            btn.classList.remove('bg-gray-200', 'text-gray-800');
        } else {
            btn.classList.remove('active', 'bg-blue-700', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-800');
        }
    });
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
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Creates student groups based on the desired size.
 */
function createStudentGroups(students, groupSize) {
    const shuffledStudents = [...students];
    shuffleArray(shuffledStudents);
    const groups = [];
    while (shuffledStudents.length >= groupSize) {
        groups.push(shuffledStudents.splice(0, groupSize));
    }
    if (shuffledStudents.length === 1 && groups.length > 0) {
        groups[groups.length - 1].push(shuffledStudents.pop());
    } else if (shuffledStudents.length > 0) {
        groups.push(shuffledStudents);
    }
    return groups;
}

/**
 * Main function to generate the chart, delegating to the correct sub-function.
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
 * Generates an interactive chart for groups.
 */
function generateGroupChart(students, groupSize) {
    const groups = createStudentGroups(students, groupSize);
    const cols = 8;
    const grid = [];
    groups.forEach((group, groupIndex) => {
        const color = groupColors[groupIndex % groupColors.length];
        const groupShape = groupSize === 2 ? { w: 2, h: 1 } : { w: 2, h: 2 };
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
    renderGrid(grid);
}

/**
 * Checks if a rectangular area in the grid is empty.
 */
function isSpotAvailable(grid, r, c, w, h) {
    for (let i = r; i < r + h; i++) {
        for (let j = c; j < c + w; j++) {
            if (grid[i] && grid[i][j]) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Places a group's data into the 2D grid array.
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
 * Renders an interactive seating chart from the 2D grid data.
 */
function renderGrid(grid) {
    const maxRows = grid.length;
    const maxCols = grid.reduce((max, row) => Math.max(max, row.length), 0);
    seatingChartGrid.style.gridTemplateColumns = `repeat(${maxCols}, 1fr)`;
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
 * Initializes the Teacher Tools page after the user is authenticated.
 */
async function initializePageSpecificApp() {
    groupBtns.forEach(btn => btn.disabled = true);
    
    generateIndividualsBtn.addEventListener('click', () => { updateActiveButton(0); generateChart(); });
    generatePairsBtn.addEventListener('click', () => { updateActiveButton(2); generateChart(); });
    generateThreesBtn.addEventListener('click', () => { updateActiveButton(3); generateChart(); });
    generateFoursBtn.addEventListener('click', () => { updateActiveButton(4); generateChart(); });
    
    classDropdown.addEventListener('change', () => { 
        updateActiveButton(0); 
        generateChart(); 
    });

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            await fetchAllStudentData();
            populateCourseDropdownFromData();
            populateDropdown('classDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            classDropdown.removeAttribute("disabled");
            groupBtns.forEach(btn => btn.disabled = false);
            updateActiveButton(0);
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
