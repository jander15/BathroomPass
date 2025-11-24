// js/teacher_tools.js

// --- DOM Element Caching ---
let classDropdown, chartMessage, seatingChartGrid, toolsContent;
let generatePairsBtn, generateThreesBtn, generateFoursBtn;
let groupCountInput, generateGroupsByCountBtn;
let unselectedStudentsGrid;
let selectAllBtn, deselectAllBtn;
let startClassBtn, originalSeatingBtn, attendanceToggleBtn, jigsawBtn;
let setupButtons, inClassButtons; // Button containers
let groupBtns = [];
let sortableInstance = null;
let seatContextMenu;

// --- State Tracking ---
let classStarted = false;
let originalSeating = null;
let preselectedStudents = new Set();
let participatedStudents = new Set();
let attendanceVisible = true;

let showTimerBtn, timerContainer, timerHeader, timerHideBtn, timerMinutesInput, timerSecondsInput, timerPlayPauseBtn, timerResetBtn, timerAudio;
let timeRemaining = 0;
let timerInterval = null;
let playIcon, pauseIcon;

let quillInstance;
let modeTextBtn, modeEmbedBtn, embedControls, embedUrlInput, loadEmbedBtn, quillEditorContainer, embedContainer, contentFrame;
// NEW variables
let toggleInstructionsBtn, instructionContainer, toggleToolbarBtn;


// --- Color Palette for Groups ---
const groupColors = [ { bg: '#fef2f2', border: '#fca5a5' }, { bg: '#fff7ed', border: '#fdba74' }, { bg: '#fefce8', border: '#fde047' }, { bg: '#f7fee7', border: '#bef264' }, { bg: '#ecfdf5', border: '#86efac' }, { bg: '#eff6ff', border: '#93c5fd' }, { bg: '#f5f3ff', border: '#c4b5fd' }, { bg: '#faf5ff', border: '#d8b4fe' }, { bg: '#fdf2f8', border: '#f9a8d4' }];

/** Caches all DOM elements specific to the Teacher Tools page. */
function cacheToolsDOMElements() {
    classDropdown = document.getElementById('classDropdown');
    chartMessage = document.getElementById('chartMessage');
    seatingChartGrid = document.getElementById('seatingChartGrid');
    toolsContent = document.getElementById('toolsContent');
    generatePairsBtn = document.getElementById('generatePairsBtn');
    generateThreesBtn = document.getElementById('generateThreesBtn');
    generateFoursBtn = document.getElementById('generateFoursBtn');
    groupCountInput = document.getElementById('groupCountInput');
    generateGroupsByCountBtn = document.getElementById('generateGroupsByCountBtn');
    unselectedStudentsGrid = document.getElementById('unselectedStudentsGrid');
    selectAllBtn = document.getElementById('selectAllBtn');
    deselectAllBtn = document.getElementById('deselectAllBtn');
    startClassBtn = document.getElementById('startClassBtn');
    originalSeatingBtn = document.getElementById('originalSeatingBtn');
    attendanceToggleBtn = document.getElementById('attendanceToggleBtn');
    setupButtons = document.getElementById('setupButtons');
    inClassButtons = document.getElementById('inClassButtons');
    groupBtns = [generatePairsBtn, generateThreesBtn, generateFoursBtn, generateGroupsByCountBtn];
    showTimerBtn = document.getElementById('showTimerBtn');
    jigsawBtn = document.getElementById('jigsawBtn');
    timerContainer = document.getElementById('timerContainer');
    timerHeader = document.getElementById('timerHeader');
    timerHideBtn = document.getElementById('timerHideBtn');
    timerMinutesInput = document.getElementById('timerMinutes');
    timerSecondsInput = document.getElementById('timerSeconds');
    timerPlayPauseBtn = document.getElementById('timerPlayPauseBtn');
    timerResetBtn = document.getElementById('timerResetBtn');
    timerAudio = document.getElementById('timerAudio');
    seatContextMenu = document.getElementById('seatContextMenu');
    playIcon = document.getElementById('playIcon');
    pauseIcon = document.getElementById('pauseIcon');
    
    modeTextBtn = document.getElementById('modeTextBtn');
    modeEmbedBtn = document.getElementById('modeEmbedBtn');
    embedControls = document.getElementById('embedControls');
    embedUrlInput = document.getElementById('embedUrlInput');
    loadEmbedBtn = document.getElementById('loadEmbedBtn');
    quillEditorContainer = document.getElementById('quillEditorContainer');
    embedContainer = document.getElementById('embedContainer');
    contentFrame = document.getElementById('contentFrame');
    
    // NEW Caching
    toggleInstructionsBtn = document.getElementById('toggleInstructionsBtn');
    instructionContainer = document.getElementById('instructionContainer');
    toggleToolbarBtn = document.getElementById('toggleToolbarBtn');
}

/**
 * Makes an HTML element draggable by its handle.
 */
function makeElementDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    const dragMouseDown = (e) => {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    };

    const elementDrag = (e) => {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    };

    const closeDragElement = () => {
        document.onmouseup = null;
        document.onmousemove = null;
    };

    handle.onmousedown = dragMouseDown;
}

/** Formats seconds into MM:SS format. */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return { mins, secs };
}

/** Updates the timer input fields with the current time remaining. */
function updateTimerDisplay() {
    const { mins, secs } = formatTime(timeRemaining);
    timerMinutesInput.value = mins;
    timerSecondsInput.value = secs;
}

function playTimer() {
    stopTimerSound();
    if (timerInterval) return;

    if (timeRemaining <= 0) {
        const minutes = parseInt(timerMinutesInput.value, 10) || 0;
        const seconds = parseInt(timerSecondsInput.value, 10) || 0;
        timeRemaining = (minutes * 60) + seconds;
    }

    if (timeRemaining > 0) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                pauseIcon.classList.add('hidden');
                playIcon.classList.remove('hidden');
                timerAudio.play();
                showSuccessAlert("Time's up!");
            }
        }, 1000);
    }
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    pauseIcon.classList.add('hidden');
    playIcon.classList.remove('hidden');
    stopTimerSound();
}

function resetTimer() {
    pauseTimer();
    timeRemaining = 0;
    timerMinutesInput.value = "5";
    timerSecondsInput.value = "00";
}

function stopTimerSound() {
    if (timerAudio) {
        timerAudio.pause();
        timerAudio.currentTime = 0;
    }
}

/** Initializes Draggable.js Sortable functionality. */
function initializeSortable() {
    if (sortableInstance) sortableInstance.destroy();
    const containers = document.querySelectorAll('#seatingChartGrid, #unselectedStudentsGrid, .group-container');
    sortableInstance = new Draggable.Sortable(containers, {
        draggable: '.draggable-item',
        handle: '.draggable-item',
        mirror: { constrainDimensions: true },
        plugins: [Draggable.Plugins.ResizeMirror],
    });
    
    sortableInstance.on('sortable:stop', () => {
        updateJigsawButtonVisibility();
    });
}

function toggleDragAndDrop(enable) {
    if (enable) {
        initializeSortable();
    } else {
        if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null;
        }
    }
}

function updateActiveButton(activeBtn) {
    groupBtns.forEach(btn => {
        if (btn === activeBtn) btn.classList.add('active', 'bg-blue-700', 'text-white');
        else btn.classList.remove('active', 'bg-blue-700', 'text-white');
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function createStudentGroupsBySize(students, groupSize) {
    const shuffledStudents = [...students];
    shuffleArray(shuffledStudents);
    const groups = [];
    if (groupSize === 2) {
        while (shuffledStudents.length > 0) groups.push(shuffledStudents.splice(0, 2));
        return groups;
    }
    const studentCount = students.length;
    if (studentCount === 0) return [];
    const remainder = studentCount % groupSize;
    let numGroups = Math.floor(studentCount / groupSize);
    if (remainder >= 2) numGroups++;
    if (numGroups === 0 && studentCount > 0) numGroups = 1;
    const balancedGroups = Array.from({ length: numGroups }, () => []);
    let groupIndex = 0;
    shuffledStudents.forEach(student => {
        balancedGroups[groupIndex % numGroups].push(student);
        groupIndex++;
    });
    return balancedGroups;
}

function createStudentGroupsByCount(students, groupCount) {
    const shuffledStudents = [...students];
    shuffleArray(shuffledStudents);
    if (students.length === 0) return [];
    const groups = Array.from({ length: groupCount }, () => []);
    let groupIndex = 0;
    shuffledStudents.forEach(student => {
        groups[groupIndex % groupCount].push(student);
        groupIndex++;
    });
    return groups;
}

function captureSeatingState() {
    const groups = [];
    seatingChartGrid.querySelectorAll('.group-container').forEach(container => {
        groups.push(Array.from(container.querySelectorAll('.seat')).map(seat => seat.textContent));
    });
    const unselected = Array.from(unselectedStudentsGrid.querySelectorAll('.seat')).map(seat => seat.textContent);
    return { groups, unselected };
}

function renderSeatingState(seatingState) {
    seatingChartGrid.innerHTML = '';
    unselectedStudentsGrid.innerHTML = '';
    seatingState.groups.forEach((group, index) => {
        const color = groupColors[index % groupColors.length];
        seatingChartGrid.appendChild(createGroupContainerElement(group, color));
    });
    seatingState.unselected.forEach(name => {
        unselectedStudentsGrid.appendChild(createSeatElement(name));
    });
    updateJigsawButtonVisibility();
    toggleDragAndDrop(false);
    applyAttendanceStyles();
}

function applyAttendanceStyles() {
    toolsContent.querySelectorAll('.seat').forEach(seat => {
        const studentName = seat.textContent;
        const isPreselected = preselectedStudents.has(studentName);
        const hasParticipated = participatedStudents.has(studentName);
        seat.classList.remove('selected', 'participated', 'attendance-hidden');
        if (attendanceVisible) {
            if (isPreselected) seat.classList.add('selected');
            if (hasParticipated) seat.classList.add('participated');
        } else {
            if (isPreselected || hasParticipated) {
                seat.classList.add('attendance-hidden');
            }
        }
    });
}

function generateInitialChart() {
    const selectedClass = classDropdown.value;
    if (!selectedClass || selectedClass === DEFAULT_CLASS_OPTION) return;
    
    classStarted = false;
    originalSeating = null;
    attendanceVisible = true;
    preselectedStudents.clear();
    participatedStudents.clear();
    
    setupButtons.classList.remove('hidden');
    inClassButtons.classList.add('hidden');
    startClassBtn.disabled = false;
    
    const students = appState.data.allNamesFromSheet.filter(s => s.Class === selectedClass).map(s => normalizeName(s.Name));
    chartMessage.textContent = `Seating Chart for ${selectedClass} (${students.length} students)`;
    
    const initialGroups = createStudentGroupsBySize(students, 2);
    seatingChartGrid.innerHTML = '';
    unselectedStudentsGrid.innerHTML = '';
    initialGroups.forEach((group, index) => {
        const color = groupColors[index % groupColors.length];
        seatingChartGrid.appendChild(createGroupContainerElement(group, color));
    });
    
    toggleDragAndDrop(false);
}

function generateSelectiveChart() {
    const allStudents = Array.from(toolsContent.querySelectorAll('.seat')).map(seat => seat.textContent);
    const namesToRegroup = allStudents.filter(name => preselectedStudents.has(name) || participatedStudents.has(name));
    const unselectedNames = allStudents.filter(name => !preselectedStudents.has(name) && !participatedStudents.has(name));
    if (namesToRegroup.length === 0) {
        showErrorAlert("No students are selected for grouping.");
        return;
    }
    const activeModeBtn = document.querySelector('.group-btn.active');
    if (!activeModeBtn) { showErrorAlert("Please select a grouping method."); return; }
    
    const mode = activeModeBtn.id;
    let generatedGroups;
    if (mode === 'generateGroupsByCountBtn') {
        const groupCount = parseInt(groupCountInput.value, 10);
        generatedGroups = createStudentGroupsByCount(namesToRegroup, groupCount);
    } else {
        const groupSize = parseInt(activeModeBtn.dataset.groupsize, 10);
        generatedGroups = createStudentGroupsBySize(namesToRegroup, groupSize);
    }
    
    seatingChartGrid.innerHTML = '';
    unselectedStudentsGrid.innerHTML = '';
    generatedGroups.forEach((group, index) => {
        const color = groupColors[index % groupColors.length];
        seatingChartGrid.appendChild(createGroupContainerElement(group, color));
    });
    unselectedNames.forEach(name => {
        unselectedStudentsGrid.appendChild(createSeatElement(name));
    });
    updateJigsawButtonVisibility();
    toggleDragAndDrop(!attendanceVisible);
    applyAttendanceStyles();
}

function createSeatElement(studentName) {
    const seat = document.createElement('div');
    seat.textContent = studentName;
    seat.className = 'seat draggable-item bg-white p-2 border border-gray-300 rounded-md shadow-sm text-center text-sm flex items-center justify-center min-h-[60px] font-semibold cursor-pointer';
    return seat;
}

function createGroupContainerElement(group, color) {
    const container = document.createElement('div');
    container.className = 'group-container draggable-item';
    container.style.backgroundColor = color.bg;
    container.style.borderColor = color.border;
    const size = group.length;
    let internalCols = (size <= 4) ? 2 : (size <= 6) ? 3 : 4;
    let parentSpan = (size <= 4) ? 2 : (size <= 6) ? 3 : 4;
    container.style.gridTemplateColumns = `repeat(${internalCols}, 1fr)`;
    container.style.gridColumn = `span ${parentSpan}`;
    group.forEach(studentName => container.appendChild(createSeatElement(studentName)));
    return container;
}

function updateJigsawButtonVisibility() {
    if (inClassButtons && !inClassButtons.classList.contains('hidden')) {
        const groups = Array.from(seatingChartGrid.querySelectorAll('.group-container'));
        const allGroupsAreBigEnough = groups.every(group => group.querySelectorAll('.seat').length >= 2);
        const canJigsaw = groups.length >= 2 && allGroupsAreBigEnough;
        jigsawBtn.classList.toggle('hidden', !canJigsaw);
    } else {
        jigsawBtn.classList.add('hidden');
    }
}

function generateJigsawGroups() {
    const originalGroups = [];
    seatingChartGrid.querySelectorAll('.group-container').forEach(container => {
        originalGroups.push(Array.from(container.querySelectorAll('.seat')).map(seat => seat.textContent));
    });

    if (originalGroups.length < 2 || originalGroups.some(g => g.length < 2)) {
        showErrorAlert("Jigsaw requires at least two groups, each with 2 or more students.");
        return;
    }

    const maxGroupSize = Math.max(...originalGroups.map(g => g.length));
    const tempGroups = Array.from({ length: maxGroupSize }, () => []);

    originalGroups.forEach(originalGroup => {
        originalGroup.forEach((student, index) => {
            tempGroups[index].push(student);
        });
    });

    const finalGroups = [];
    const leftovers = [];
    tempGroups.forEach(group => {
        if (group.length <= 1) {
            leftovers.push(...group);
        } else {
            finalGroups.push(group);
        }
    });

    if (finalGroups.length > 0) {
        let groupIndex = 0;
        leftovers.forEach(student => {
            finalGroups[groupIndex % finalGroups.length].push(student);
            groupIndex++;
        });
    } else if (leftovers.length > 0) {
        finalGroups.push(leftovers);
    }

    seatingChartGrid.innerHTML = '';
    finalGroups.forEach((group, index) => {
        if (group.length > 0) {
            const color = groupColors[index % groupColors.length];
            seatingChartGrid.appendChild(createGroupContainerElement(group, color));
        }
    });

    toggleDragAndDrop(!attendanceVisible);
    applyAttendanceStyles();
    updateJigsawButtonVisibility();
}

function initializeQuill() {
    if (quillInstance) return;

    quillInstance = new Quill('#quillEditorContainer', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['image', 'link', 'formula'],
                ['clean']
            ]
        }
    });
}

function showTextMode() {
    modeTextBtn.classList.add('bg-blue-600', 'text-white');
    modeTextBtn.classList.remove('bg-gray-200', 'text-gray-700');
    
    modeEmbedBtn.classList.add('bg-gray-200', 'text-gray-700');
    modeEmbedBtn.classList.remove('bg-blue-600', 'text-white');

    embedControls.classList.add('hidden');
    embedContainer.classList.add('hidden');
    
    // Show Quill toolbar and container
    // Note: Quill usually modifies the DOM to put the toolbar before the container. 
    // We find the toolbar by its class since Quill generates it.
    const toolbar = document.querySelector('.ql-toolbar');
    if(toolbar) {
        toolbar.classList.remove('hidden');
        // Ensure the toggle button says 'Hide' if we are switching back to text mode
        if(toggleToolbarBtn.textContent === "Show Tools") {
             toolbar.classList.add('hidden');
        }
    }
    quillEditorContainer.classList.remove('hidden');
    toggleToolbarBtn.classList.remove('hidden'); // Show the toggle button in text mode
}

function showEmbedMode() {
    modeEmbedBtn.classList.add('bg-blue-600', 'text-white');
    modeEmbedBtn.classList.remove('bg-gray-200', 'text-gray-700');

    modeTextBtn.classList.add('bg-gray-200', 'text-gray-700');
    modeTextBtn.classList.remove('bg-blue-600', 'text-white');

    embedControls.classList.remove('hidden');
    embedContainer.classList.remove('hidden');

    // Hide Quill toolbar and container
    const toolbar = document.querySelector('.ql-toolbar');
    if(toolbar) toolbar.classList.add('hidden');
    quillEditorContainer.classList.add('hidden');
    toggleToolbarBtn.classList.add('hidden'); // Hide the toggle button in embed mode
}

function loadEmbedUrl() {
    let url = embedUrlInput.value.trim();
    if (!url) return;
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }
    contentFrame.src = url;
}

// NEW: Function to toggle the Quill toolbar visibility
function toggleQuillToolbar() {
    const toolbar = document.querySelector('.ql-toolbar');
    if (!toolbar) return;
    
    if (toolbar.classList.contains('hidden')) {
        toolbar.classList.remove('hidden');
        toggleToolbarBtn.textContent = "Hide Tools";
    } else {
        toolbar.classList.add('hidden');
        toggleToolbarBtn.textContent = "Show Tools";
    }
}

// NEW: Function to toggle the entire instruction container visibility
function toggleInstructions() {
    instructionContainer.classList.toggle('hidden');
    // Update the button style to indicate state? 
    // For now just toggling visibility is fine.
}

async function initializePageSpecificApp() {
    cacheToolsDOMElements();

    initializeQuill();
    
    modeTextBtn.addEventListener('click', showTextMode);
    modeEmbedBtn.addEventListener('click', showEmbedMode);
    loadEmbedBtn.addEventListener('click', loadEmbedUrl);
    
    // NEW Event Listeners
    toggleToolbarBtn.addEventListener('click', toggleQuillToolbar);
    toggleInstructionsBtn.addEventListener('click', toggleInstructions);

    groupBtns.forEach(btn => btn.disabled = true);
    
    groupBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            updateActiveButton(e.currentTarget);
            generateSelectiveChart();
        });
    });
    
    classDropdown.addEventListener('change', generateInitialChart);

    toolsContent.addEventListener('contextmenu', (event) => {
        const seat = event.target.closest('.seat');
        if (!seat) return;

        event.preventDefault();

        const studentName = seat.textContent;

        const menuHtml = `
            <button class="context-menu-btn" data-action="markPresent" data-student="${studentName}">Mark as Present (Green)</button>
            <button class="context-menu-btn" data-action="markTardy" data-student="${studentName}">Mark as Tardy (Yellow)</button>
            <div class="context-menu-divider"></div>
            <button class="context-menu-btn" data-action="deselect" data-student="${studentName}">Deselect</button>
        `;
        
        seatContextMenu.innerHTML = menuHtml;
        seatContextMenu.style.top = `${event.pageY}px`;
        seatContextMenu.style.left = `${event.pageX}px`;
        seatContextMenu.classList.remove('hidden');
    });

    seatContextMenu.addEventListener('click', (event) => {
        const button = event.target.closest('.context-menu-btn');
        if (!button) return;

        const { action, student } = button.dataset;

        if (action === 'markPresent') {
            participatedStudents.delete(student);
            preselectedStudents.add(student);
        } else if (action === 'markTardy') {
            preselectedStudents.delete(student);
            participatedStudents.add(student);
        } else if (action === 'deselect') {
            preselectedStudents.delete(student);
            participatedStudents.delete(student);
        }

        applyAttendanceStyles();
        seatContextMenu.classList.add('hidden');
    });

    document.addEventListener('click', (event) => {
        if (event.target.closest('#seatContextMenu')) {
            return;
        }

        if (!seatContextMenu.classList.contains('hidden')) {
            seatContextMenu.classList.add('hidden');
        }

        const seat = event.target.closest('.seat');
        if (seat) {
            const studentName = seat.textContent;
            if (classStarted) {
                if (preselectedStudents.has(studentName)) {
                    preselectedStudents.delete(studentName);
                }else if (participatedStudents.has(studentName)) {
                    participatedStudents.delete(studentName);
                }else {
                    participatedStudents.add(studentName);
                }
            } else {
                if (preselectedStudents.has(studentName)) {
                    preselectedStudents.delete(studentName);
                } else {
                    preselectedStudents.add(studentName);
                }
            }
            applyAttendanceStyles();
        }
    });

    jigsawBtn.addEventListener('click', generateJigsawGroups);

    selectAllBtn.addEventListener('click', () => {
        toolsContent.querySelectorAll('.seat').forEach(seat => {
            preselectedStudents.add(seat.textContent);
        });
        applyAttendanceStyles();
    });

    deselectAllBtn.addEventListener('click', () => {
        preselectedStudents.clear();
        participatedStudents.clear();
        applyAttendanceStyles();
    });
    
    startClassBtn.addEventListener('click', () => {
        classStarted = true;
        originalSeating = captureSeatingState();
        setupButtons.classList.add('hidden');
        inClassButtons.classList.remove('hidden');
        originalSeatingBtn.disabled = false;
        preselectedStudents.clear();
        toolsContent.querySelectorAll('.seat.selected').forEach(seat => {
            preselectedStudents.add(seat.textContent);
        });
        updateJigsawButtonVisibility();
        showSuccessAlert("Class started! You can now track participation.");
    });

    originalSeatingBtn.addEventListener('click', () => {
        if (originalSeating) renderSeatingState(originalSeating);
    });

    attendanceToggleBtn.addEventListener('click', () => {
        attendanceVisible = !attendanceVisible;
        attendanceToggleBtn.textContent = attendanceVisible ? "Arrange Mode" : "Attendance Mode";
        toggleDragAndDrop(!attendanceVisible);
        applyAttendanceStyles();
    });

    showTimerBtn.addEventListener('click', () => {
        timerContainer.classList.remove('hidden');
    });

    timerHideBtn.addEventListener('click', () => {
        timerContainer.classList.add('hidden');
        stopTimerSound();
    });

    timerPlayPauseBtn.addEventListener('click', () => {
        if (timerInterval) {
            pauseTimer();
        } else {
            playTimer();
        }
    });

    timerResetBtn.addEventListener('click', resetTimer);

    makeElementDraggable(timerContainer, timerHeader);

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            await fetchAllStudentData();
            populateCourseDropdownFromData();
            populateDropdown('classDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            classDropdown.removeAttribute("disabled");
            groupBtns.forEach(btn => btn.disabled = false);
            updateActiveButton(generatePairsBtn);
        } catch (error) {
            showErrorAlert("Could not load class data. Please reload.");
            console.error("Error during data fetch:", error);
        }
    }
}

function resetPageSpecificAppState() {
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
    classStarted = false;
    originalSeating = null;
    attendanceVisible = true;
    preselectedStudents.clear();
    participatedStudents.clear();

    if (setupButtons) setupButtons.classList.remove('hidden');
    if (inClassButtons) inClassButtons.classList.add('hidden');
    
    if (classDropdown) populateDropdown('classDropdown', [], DEFAULT_CLASS_OPTION, "");
    if (seatingChartGrid) seatingChartGrid.innerHTML = '';
    if (unselectedStudentsGrid) unselectedStudentsGrid.innerHTML = '';
    if (chartMessage) chartMessage.textContent = "Select a class and click a button to generate a chart.";
}