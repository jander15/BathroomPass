// js/teacher_tools.js

// --- DOM Element Caching ---
const classDropdown = document.getElementById('classDropdown');
const rowsInput = document.getElementById('rowsInput');
const colsInput = document.getElementById('colsInput');
const generateChartBtn = document.getElementById('generateChartBtn');
const chartMessage = document.getElementById('chartMessage');
const seatingChartGrid = document.getElementById('seatingChartGrid');

// --- State for Click-to-Swap ---
let firstSelectedTile = null;

/**
 * Swaps the content and styling of two seat elements.
 * @param {HTMLElement} tile1 The first seat element.
 * @param {HTMLElement} tile2 The second seat element.
 */
function swapTiles(tile1, tile2) {
    // Swap the text content
    const tempText = tile1.textContent;
    tile1.textContent = tile2.textContent;
    tile2.textContent = tempText;

    // Swap the classes that determine if a seat is empty or not
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

// --- Event Handlers for Drag and Drop ---
function handleDragStart(e) {
    e.target.classList.add('dragging');
    // Set data to be the ID of the dragged element
    e.dataTransfer.setData('text/plain', e.target.id);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
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
        // This is the first tile being selected
        firstSelectedTile = clickedTile;
        firstSelectedTile.classList.add('selected');
    } else if (firstSelectedTile === clickedTile) {
        // The same tile was clicked again, so deselect it
        firstSelectedTile.classList.remove('selected');
        firstSelectedTile = null;
    } else {
        // This is the second tile, so perform the swap
        swapTiles(firstSelectedTile, clickedTile);
        
        // Reset the selection
        firstSelectedTile.classList.remove('selected');
        firstSelectedTile = null;
    }
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Generates and displays the randomized seating chart.
 */
function generateSeatingChart() {
    // Reset any pending click-to-swap action
    if (firstSelectedTile) {
        firstSelectedTile.classList.remove('selected');
        firstSelectedTile = null;
    }

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

    const students = appState.data.allNamesFromSheet
        .filter(student => student.Class === selectedClass)
        .map(student => normalizeName(student.Name));

    shuffleArray(students);

    chartMessage.textContent = `Seating Chart for ${selectedClass} (${students.length} students)`;
    seatingChartGrid.innerHTML = '';
    seatingChartGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    const totalSeats = rows * cols;

    for (let i = 0; i < totalSeats; i++) {
        const seat = document.createElement('div');
        seat.id = `seat-${i}`; // Give each seat a unique ID
        seat.className = 'seat bg-white p-2 border border-gray-300 rounded-md shadow-sm text-center text-sm flex items-center justify-center min-h-[60px] cursor-pointer transition-transform duration-150';
        seat.draggable = true; // Make the seat draggable

        // Add all necessary event listeners
        seat.addEventListener('dragstart', handleDragStart);
        seat.addEventListener('dragend', handleDragEnd);
        seat.addEventListener('dragover', handleDragOver);
        seat.addEventListener('dragleave', handleDragLeave);
        seat.addEventListener('drop', handleDrop);
        seat.addEventListener('click', handleTileClick);
        
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
    generateChartBtn.disabled = true;
    generateChartBtn.addEventListener('click', generateSeatingChart);

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            await fetchAllStudentData();
            populateCourseDropdownFromData();
            populateDropdown('classDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            classDropdown.removeAttribute("disabled");
            generateChartBtn.disabled = false;
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
    chartMessage.textContent = "Select a class and click \"Generate Chart\" to create a seating arrangement.";
    generateChartBtn.disabled = true;
}
