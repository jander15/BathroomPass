// js/teacher_tools.js

// --- DOM Element Caching ---
let classDropdown, seatingChartGrid, toolsContent;
let generatePairsBtn, generateThreesBtn, generateFoursBtn;
let groupCountInput, generateGroupsByCountBtn;
let unselectedStudentsGrid;
let selectAllBtn, deselectAllBtn;
let startClassBtn, originalSeatingBtn, attendanceToggleBtn, jigsawBtn, rolesBtn;
let setupButtons, inClassButtons; 
let groupBtns = [];
let sortableInstance = null;
let seatContextMenu;
// New Icons and Display
let iconToArrange, iconToAttendance, studentCountDisplay;

// --- State Tracking ---
let classStarted = false;
let originalSeating = null;
let preselectedStudents = new Set();
let participatedStudents = new Set();
let attendanceVisible = true;

// Timer State
let showTimerBtn, timerContainer, timerHeader, timerHideBtn, timerMinutesInput, timerSecondsInput, timerPlayPauseBtn, timerResetBtn, timerAudio;
let minUpBtn, minDownBtn;
let timeRemaining = 0;
let timerInterval = null;
let playIcon, pauseIcon;

// Editor State
let quillInstance;
let modeTextBtn, modeEmbedBtn, embedControls, embedUrlInput, loadEmbedBtn, quillEditorContainer, embedContainer, contentFrame;
let toggleInstructionsBtn, instructionContainer, showToolbarBtn, toggleFullScreenBtn;
let bgColorMenu; 
// New header toggle elements
let instructionHeader, hideHeaderBtn, showHeaderBtn;

// Roles State
let rolesPanel, rolesHeader, closeRolesBtn, activeRolesList, assignRolesBtn, shiftRolesBtn, clearRolesBtn, defaultRolesBank, customRoleInput, addCustomRoleBtn;
let activeRoles = [];
let roleRotationIndex = 0;
const defaultRoles = ["Facilitator", "Recorder", "Presenter", "Timekeeper", "Materials", "Reflector", "Encourager", "Spy"];

// Group Number State
let groupsPanel, closeGroupsBtn, rotateGroupsBtn, groupNumBtn;
let isGroupNumbersVisible = false;

// Menu State
let moreOptionsBtn, moreOptionsMenu, appFullScreenBtn;
let rolesFullContent, rolesMiniControls, toggleRolesViewBtn, miniShiftBtn, rolesTitleExpanded;
let isRolesPanelCollapsed = false;

// --- Color Palettes ---
const groupColors = [ { bg: '#fef2f2', border: '#fca5a5' }, { bg: '#fff7ed', border: '#fdba74' }, { bg: '#fefce8', border: '#fde047' }, { bg: '#f7fee7', border: '#bef264' }, { bg: '#ecfdf5', border: '#86efac' }, { bg: '#eff6ff', border: '#93c5fd' }, { bg: '#f5f3ff', border: '#c4b5fd' }, { bg: '#faf5ff', border: '#d8b4fe' }, { bg: '#fdf2f8', border: '#f9a8d4' }];
const roleColors = [ 'bg-red-100 text-red-800 border-red-200', 'bg-orange-100 text-orange-800 border-orange-200', 'bg-purple-100 text-purple-800 border-purple-200', 'bg-pink-100 text-pink-800 border-pink-200', 'bg-gray-100 text-gray-800 border-gray-200', 'bg-rose-100 text-rose-800 border-rose-200', 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', 'bg-stone-200 text-stone-800 border-stone-300' ];
const bgColors = [ '#fefce8', '#ffffff', '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e9d5ff', '#fed7aa' ];

function cacheToolsDOMElements() {
    classDropdown = document.getElementById('classDropdown');
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
    rolesBtn = document.getElementById('rolesBtn'); 
    groupNumBtn = document.getElementById('groupNumBtn');

    // Timer
    timerContainer = document.getElementById('timerContainer');
    timerHeader = document.getElementById('timerHeader');
    timerHideBtn = document.getElementById('timerHideBtn');
    timerMinutesInput = document.getElementById('timerMinutes');
    timerSecondsInput = document.getElementById('timerSeconds');
    timerPlayPauseBtn = document.getElementById('timerPlayPauseBtn');
    timerResetBtn = document.getElementById('timerResetBtn');
    timerAudio = document.getElementById('timerAudio');
    playIcon = document.getElementById('playIcon');
    pauseIcon = document.getElementById('pauseIcon');
    minUpBtn = document.getElementById('minUpBtn');
    minDownBtn = document.getElementById('minDownBtn');

    // Editor
    modeTextBtn = document.getElementById('modeTextBtn');
    modeEmbedBtn = document.getElementById('modeEmbedBtn');
    embedControls = document.getElementById('embedControls');
    embedUrlInput = document.getElementById('embedUrlInput');
    loadEmbedBtn = document.getElementById('loadEmbedBtn');
    quillEditorContainer = document.getElementById('quillEditorContainer');
    embedContainer = document.getElementById('embedContainer');
    contentFrame = document.getElementById('contentFrame');
    toggleInstructionsBtn = document.getElementById('toggleInstructionsBtn');
    instructionContainer = document.getElementById('instructionContainer');
    showToolbarBtn = document.getElementById('showToolbarBtn'); 
    toggleFullScreenBtn = document.getElementById('toggleFullScreenBtn');
    
    // BG Color Elements
    bgColorMenu = document.getElementById('bgColorMenu');

    // Header Collapse Elements
    instructionHeader = document.getElementById('instructionHeader');
    hideHeaderBtn = document.getElementById('hideHeaderBtn');
    showHeaderBtn = document.getElementById('showHeaderBtn');

    // Roles
    rolesPanel = document.getElementById('rolesPanel');
    rolesHeader = document.getElementById('rolesHeader');
    closeRolesBtn = document.getElementById('closeRolesBtn');
    activeRolesList = document.getElementById('activeRolesList');
    assignRolesBtn = document.getElementById('assignRolesBtn');
    shiftRolesBtn = document.getElementById('shiftRolesBtn');
    clearRolesBtn = document.getElementById('clearRolesBtn');
    defaultRolesBank = document.getElementById('defaultRolesBank');
    customRoleInput = document.getElementById('customRoleInput');
    addCustomRoleBtn = document.getElementById('addCustomRoleBtn');
    rolesFullContent = document.getElementById('rolesFullContent');
    rolesMiniControls = document.getElementById('rolesMiniControls');
    toggleRolesViewBtn = document.getElementById('toggleRolesViewBtn');
    miniShiftBtn = document.getElementById('miniShiftBtn');
    rolesTitleExpanded = document.getElementById('rolesTitleExpanded');

    // Group Numbers
    groupsPanel = document.getElementById('groupsPanel');
    closeGroupsBtn = document.getElementById('closeGroupsBtn');
    rotateGroupsBtn = document.getElementById('rotateGroupsBtn');

    // Menu & Misc
    moreOptionsBtn = document.getElementById('moreOptionsBtn');
    moreOptionsMenu = document.getElementById('moreOptionsMenu');
    appFullScreenBtn = document.getElementById('appFullScreenBtn');
    seatContextMenu = document.getElementById('seatContextMenu');
    iconToArrange = document.getElementById('iconToArrange');
    iconToAttendance = document.getElementById('iconToAttendance');
    studentCountDisplay = document.getElementById('studentCountDisplay');
}

// --- HELPER: Get Student Name Safely ---
function getStudentNameFromSeat(seat) {
    const nameSpan = seat.querySelector('.student-name');
    if (nameSpan) return nameSpan.textContent;
    const clone = seat.cloneNode(true);
    clone.querySelectorAll('.role-badge').forEach(b => b.remove());
    return clone.textContent.trim();
}

// --- HELPER: Toggle Toolbar Button Active State ---
function toggleButtonState(btnId, isActive) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isActive) btn.classList.add('active');
    else btn.classList.remove('active');
}

// --- STUDENT COUNT HELPER ---
function updateStudentCount() {
    if (!appState.data.allNamesFromSheet || !classDropdown.value) return;
    const currentClass = classDropdown.value;
    const totalStudents = appState.data.allNamesFromSheet.filter(s => s.Class === currentClass).length;
    const presentCount = preselectedStudents.size + participatedStudents.size;
    
    if (studentCountDisplay) {
        studentCountDisplay.textContent = `Present: ${presentCount} / ${totalStudents}`;
    }
}

// --- TIMER ---
function formatTime(seconds) { const mins = Math.floor(seconds / 60).toString().padStart(2, '0'); const secs = (seconds % 60).toString().padStart(2, '0'); return { mins, secs }; }
function updateTimerDisplay() { const { mins, secs } = formatTime(timeRemaining); timerMinutesInput.value = mins; timerSecondsInput.value = secs; }
function stopTimerSound() { if (timerAudio) { timerAudio.pause(); timerAudio.currentTime = 0; } }
function playTimer() { stopTimerSound(); if (timerInterval) return; if (timeRemaining <= 0) { const minutes = parseInt(timerMinutesInput.value, 10) || 0; const seconds = parseInt(timerSecondsInput.value, 10) || 0; timeRemaining = (minutes * 60) + seconds; } if (timeRemaining > 0) { playIcon.classList.add('hidden'); pauseIcon.classList.remove('hidden'); timerInterval = setInterval(() => { timeRemaining--; updateTimerDisplay(); if (timeRemaining <= 0) { clearInterval(timerInterval); timerInterval = null; pauseIcon.classList.add('hidden'); playIcon.classList.remove('hidden'); timerAudio.play(); showSuccessAlert("Time's up!"); } }, 1000); } }
function pauseTimer() { clearInterval(timerInterval); timerInterval = null; pauseIcon.classList.add('hidden'); playIcon.classList.remove('hidden'); stopTimerSound(); }
function resetTimer() { pauseTimer(); timeRemaining = 0; timerMinutesInput.value = "5"; timerSecondsInput.value = "00"; }
function adjustTimerMinutes(amount) {
    let current = parseInt(timerMinutesInput.value, 10) || 0;
    let next = Math.max(0, current + amount);
    timerMinutesInput.value = next;
    if (!timerInterval) {
        timeRemaining = (next * 60) + (parseInt(timerSecondsInput.value, 10) || 0);
    }
}

// --- ROLES ---
function renderRolesUI() {
    activeRolesList.innerHTML = '';
    if (activeRoles.length === 0) { activeRolesList.innerHTML = '<span class="text-gray-400 italic">Select roles below...</span>'; }
    else {
        activeRoles.forEach((role, index) => {
            const tag = document.createElement('div');
            const colorClass = roleColors[index % roleColors.length];
            tag.className = `role-tag active ${colorClass}`;
            tag.innerHTML = `${role} <span class="ml-1 font-bold">&times;</span>`;
            tag.onclick = () => removeRole(index);
            activeRolesList.appendChild(tag);
        });
    }
    defaultRolesBank.innerHTML = '';
    defaultRoles.forEach(role => {
        if (!activeRoles.includes(role)) {
            const btn = document.createElement('button');
            btn.className = 'role-tag default';
            btn.textContent = role;
            btn.onclick = () => addRole(role);
            defaultRolesBank.appendChild(btn);
        }
    });
}
function addRole(roleName) { if (roleName && !activeRoles.includes(roleName)) { activeRoles.push(roleName); renderRolesUI(); } }
function removeRole(index) { activeRoles.splice(index, 1); renderRolesUI(); }
function handleCustomRoleAdd() { const name = customRoleInput.value.trim(); if (name) { addRole(name); customRoleInput.value = ''; } }
function toggleRolesPanelState(collapse) {
    isRolesPanelCollapsed = collapse;
    if (collapse) {
        rolesFullContent.classList.add('hidden');
        rolesMiniControls.classList.remove('hidden');
        rolesTitleExpanded.classList.add('hidden');
        rolesPanel.classList.remove('w-96');
        rolesPanel.classList.add('w-auto');
        toggleRolesViewBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-up" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>`;
    } else {
        rolesFullContent.classList.remove('hidden');
        rolesMiniControls.classList.add('hidden');
        rolesTitleExpanded.classList.remove('hidden');
        rolesPanel.classList.remove('w-auto');
        rolesPanel.classList.add('w-96');
        toggleRolesViewBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>`;
    }
}
function assignRolesToGroups() {
    if (activeRoles.length === 0) { showErrorAlert("Please add at least one role."); return; }
    roleRotationIndex = 0;
    shiftRolesBtn.classList.remove('hidden');
    distributeRoles();
    showSuccessAlert("Roles assigned!");
    toggleRolesPanelState(true);
}
function shiftRoles() { roleRotationIndex++; distributeRoles(); }
function distributeRoles() {
    const groups = document.querySelectorAll('.group-container');
    groups.forEach(group => {
        const seats = Array.from(group.querySelectorAll('.seat'));
        if (seats.length === 0) return;
        seats.forEach(seat => { const b = seat.querySelector('.role-badge'); if(b) b.remove(); });
        let currentGroupRoles = [];
        for(let i=0; i<seats.length; i++) {
            if (i < activeRoles.length) currentGroupRoles.push(activeRoles[i]);
            else currentGroupRoles.push(null);
        }
        const rotation = roleRotationIndex % Math.max(seats.length, activeRoles.length);
        for(let r=0; r<rotation; r++) currentGroupRoles.unshift(currentGroupRoles.pop());
        seats.forEach((seat, index) => {
            const role = currentGroupRoles[index];
            if (role) {
                const badge = document.createElement('span');
                const roleIndex = activeRoles.indexOf(role);
                const colorClass = roleIndex > -1 ? roleColors[roleIndex % roleColors.length] : 'bg-gray-100 text-gray-800 border-gray-200';
                badge.className = `role-badge ${colorClass}`;
                badge.textContent = role;
                seat.appendChild(badge);
            }
        });
    });
}
function clearRoles() {
    document.querySelectorAll('.role-badge').forEach(el => el.remove());
    shiftRolesBtn.classList.add('hidden');
    roleRotationIndex = 0;
}

// --- GROUP NUMBER FUNCTIONS ---
function updateGroupNumbers() {
    const groups = document.querySelectorAll('.group-container');
    groups.forEach((group, index) => {
        const existing = group.querySelector('.group-number-badge');
        if (existing) existing.remove();
        if (isGroupNumbersVisible) {
            const badge = document.createElement('div');
            badge.className = 'group-number-badge';
            badge.textContent = index + 1;
            group.appendChild(badge);
        }
    });
}

function rotateGroups() {
    const groups = Array.from(seatingChartGrid.querySelectorAll('.group-container'));
    if (groups.length < 2) {
        showErrorAlert("Need at least 2 groups to rotate.");
        return;
    }
    const groupStudents = groups.map(group => {
        return Array.from(group.querySelectorAll('.seat')).map(seat => getStudentNameFromSeat(seat));
    });
    groupStudents.unshift(groupStudents.pop()); // Shift Right
    seatingChartGrid.innerHTML = '';
    
    groupStudents.forEach((students, index) => {
        const color = groupColors[index % groupColors.length];
        const container = createGroupContainerElement(students, color);
        seatingChartGrid.appendChild(container);
    });

    toggleDragAndDrop(!attendanceVisible);
    applyAttendanceStyles();
    updateJigsawButtonVisibility();
    updateGroupNumbers();
    if (activeRoles.length > 0) distributeRoles();
}


// --- EDITOR & CHART ---
function initializeQuill() {
    if (quillInstance) return;
    
    // 1. Configure Size Whitelist
    const Size = Quill.import('attributors/style/size');
    Size.whitelist = ['24px', '36px', '48px', '60px'];
    Quill.register(Size, true);

    try {
        let ResizeModule = ImageResize;
        if (ResizeModule && typeof ResizeModule !== 'function' && ResizeModule.default) { ResizeModule = ResizeModule.default; }
        Quill.register('modules/imageResize', ResizeModule);
    } catch (e) { console.error("Could not register Image Resize module.", e); }
    
    quillInstance = new Quill('#quillEditorContainer', {
        theme: 'snow',
        modules: {
            imageResize: { displaySize: true },
            toolbar: [ 
                [{ 'size': Size.whitelist }], 
                ['bold', 'italic', 'underline', 'strike'], 
                [{ 'color': [] }, { 'background': [] }], 
                [{ 'list': 'ordered'}, { 'list': 'bullet' }], 
                [{ 'align': [] }], 
                ['image', 'link', 'formula'], 
                ['clean'] 
            ]
        }
    });

    // INJECT CLOSE BUTTON into Toolbar
    const toolbar = document.querySelector('.ql-toolbar');
    if (toolbar) {
        toolbar.classList.add('hidden'); // Start hidden
        
        // Create BG Color Trigger
        const bgBtn = document.createElement('span');
        bgBtn.className = 'ql-widget-bg-btn';
        bgBtn.title = "Widget Background Color";
        bgBtn.onclick = (e) => {
             e.stopPropagation();
             // Reposition the menu relative to this button
             const rect = bgBtn.getBoundingClientRect();
             bgColorMenu.style.position = 'fixed';
             bgColorMenu.style.top = (rect.bottom + 5) + 'px';
             bgColorMenu.style.left = rect.left + 'px';
             bgColorMenu.classList.toggle('hidden');
        };
        
        // Insert it at the beginning of toolbar
        toolbar.insertBefore(bgBtn, toolbar.firstChild);
        
        // Insert Close Button at end
        const closeBtn = document.createElement('span');
        closeBtn.className = 'ql-toolbar-close';
        closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-up" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>`;
        closeBtn.title = "Hide Tools";
        closeBtn.onclick = toggleQuillToolbar;
        toolbar.appendChild(closeBtn);
    }
    
    // 2. Set Default Size (48px) and Align Center
    setTimeout(() => {
        quillInstance.format('size', '48px'); 
        quillInstance.format('align', 'center'); 
        
        if (quillInstance.getText().trim().length === 0) {
            quillInstance.setText("\n");
            quillInstance.formatLine(0, 1, 'size', '48px'); 
            quillInstance.formatLine(0, 1, 'align', 'center');
        }
    }, 100);
    
    renderBgColorMenu();
}

// NEW: Render the Color Menu Grid
function renderBgColorMenu() {
    bgColorMenu.innerHTML = '';
    bgColors.forEach(color => {
        const btn = document.createElement('button');
        btn.className = 'w-8 h-8 rounded-md border border-gray-200 shadow-sm hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-indigo-500';
        btn.style.backgroundColor = color;
        btn.onclick = (e) => {
            e.stopPropagation(); 
            updateBackgroundColor(color);
            bgColorMenu.classList.add('hidden');
        };
        bgColorMenu.appendChild(btn);
    });
}

function updateBackgroundColor(color) {
    instructionContainer.style.backgroundColor = color;
    quillEditorContainer.style.backgroundColor = color;
    bgColorBtn.style.backgroundColor = color; // Update preview button
}

// Collapsible Header Logic
function toggleHeaderVisibility(show) {
    const toolbar = document.querySelector('.ql-toolbar');
    if (show) {
        instructionHeader.classList.remove('hidden');
        showHeaderBtn.classList.add('hidden');
        // Logic: If we are in Text Mode, show toolbar again
        if (embedContainer.classList.contains('hidden')) {
            if (toolbar) toolbar.classList.remove('hidden');
        }
    } else {
        instructionHeader.classList.add('hidden');
        showHeaderBtn.classList.remove('hidden');
        if (toolbar) toolbar.classList.add('hidden');
    }
}

// App Full Screen Logic
function toggleAppFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error enabling full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
}

// Instruction Full Screen Logic
function toggleFullScreen() {
    const isFS = instructionContainer.classList.toggle('instruction-fullscreen');
    quillEditorContainer.classList.toggle('editor-fullscreen');
    quillEditorContainer.classList.toggle('editor-normal');
    embedContainer.classList.toggle('editor-fullscreen');
    embedContainer.classList.toggle('editor-normal');

    if(isFS) {
        // Enter Full Screen
        toggleFullScreenBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-arrows-angle-contract" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M.172 15.828a.5.5 0 0 0 .707 0l4.096-4.096V14.5a.5.5 0 1 0 1 0v-3.975a.5.5 0 0 0-.5-.5H1.5a.5.5 0 0 0 0 1h2.768L.172 15.121a.5.5 0 0 0 0 .707zM15.828.172a.5.5 0 0 0-.707 0l-4.096 4.096V1.5a.5.5 0 1 0-1 0v3.975a.5.5 0 0 0 .5.5H14.5a.5.5 0 0 0 0-1h-2.768L15.828.879a.5.5 0 0 0 0-.707z"/></svg>`;
    } else {
        // Exit Full Screen
        toggleFullScreenBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-arrows-angle-expand" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707z"/></svg>`;
    }
}

function showTextMode() { 
    modeTextBtn.classList.add('bg-blue-600', 'text-white'); 
    modeTextBtn.classList.remove('bg-gray-200', 'text-gray-700'); 
    modeEmbedBtn.classList.add('bg-gray-200', 'text-gray-700'); 
    modeEmbedBtn.classList.remove('bg-blue-600', 'text-white'); 
    
    embedControls.classList.add('hidden'); 
    embedContainer.classList.add('hidden'); 
    bgControlContainer.classList.remove('hidden'); // Show BG controls
    
    quillEditorContainer.classList.remove('hidden'); 
    
    // Always show toolbar when entering text mode
    const toolbar = document.querySelector('.ql-toolbar');
    if(toolbar) toolbar.classList.remove('hidden');
    
    if (showToolbarBtn) showToolbarBtn.classList.remove('hidden');
    
    // Sync the "Show Tools" button state
    if(showToolbarBtn && toolbar && !toolbar.classList.contains('hidden')) {
         showToolbarBtn.classList.add('hidden'); // Hide the header button if toolbar is open
    }
}

function showEmbedMode() { 
    modeEmbedBtn.classList.add('bg-blue-600', 'text-white'); 
    modeEmbedBtn.classList.remove('bg-gray-200', 'text-gray-700'); 
    modeTextBtn.classList.add('bg-gray-200', 'text-gray-700'); 
    modeTextBtn.classList.remove('bg-blue-600', 'text-white'); 
    
    embedControls.classList.remove('hidden'); 
    embedContainer.classList.remove('hidden'); 
    bgControlContainer.classList.add('hidden'); // Hide BG controls
    
    const toolbar = document.querySelector('.ql-toolbar'); 
    if(toolbar) toolbar.classList.add('hidden'); 
    quillEditorContainer.classList.add('hidden'); 
    if(showToolbarBtn) showToolbarBtn.classList.add('hidden'); 
}

function loadEmbedUrl() { let url = embedUrlInput.value.trim(); if (!url) return; if (!url.startsWith('http')) url = 'https://' + url; contentFrame.src = url; }

// UPDATED Toggle Logic
function toggleQuillToolbar() { 
    const toolbar = document.querySelector('.ql-toolbar'); 
    if (!toolbar) return; 
    
    if (toolbar.classList.contains('hidden')) { 
        // User clicked "Show Tools" (Header Button)
        toolbar.classList.remove('hidden'); 
        showToolbarBtn.classList.add('hidden'); // Hide the header button
    } else { 
        // User clicked "Close" (Toolbar Button)
        toolbar.classList.add('hidden'); 
        showToolbarBtn.classList.remove('hidden'); // Show the header button
    } 
}

function toggleInstructions() { 
    const isHidden = instructionContainer.classList.toggle('hidden');
    toggleButtonState('toggleInstructionsBtn', !isHidden);
}

function initializeSortable() {
    if (sortableInstance) sortableInstance.destroy();
    const containers = document.querySelectorAll('#seatingChartGrid, #unselectedStudentsGrid, .group-container');
    sortableInstance = new Draggable.Sortable(containers, { draggable: '.draggable-item', handle: '.draggable-item', mirror: { constrainDimensions: true }, plugins: [Draggable.Plugins.ResizeMirror] });
    sortableInstance.on('sortable:stop', () => { updateJigsawButtonVisibility(); });
}
function toggleDragAndDrop(enable) { if (enable) initializeSortable(); else if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; } }
function updateActiveButton(activeBtn) { groupBtns.forEach(btn => { if (btn === activeBtn) btn.classList.add('active', 'bg-blue-700', 'text-white'); else btn.classList.remove('active', 'bg-blue-700', 'text-white'); }); }
function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } }

function createStudentGroupsBySize(students, groupSize) {
    const shuffledStudents = [...students]; shuffleArray(shuffledStudents); const groups = [];
    if (groupSize === 2) { while (shuffledStudents.length > 0) groups.push(shuffledStudents.splice(0, 2)); return groups; }
    const studentCount = students.length; if (studentCount === 0) return [];
    const remainder = studentCount % groupSize; let numGroups = Math.floor(studentCount / groupSize);
    if (remainder >= 2) numGroups++; if (numGroups === 0 && studentCount > 0) numGroups = 1;
    const balancedGroups = Array.from({ length: numGroups }, () => []);
    let groupIndex = 0; shuffledStudents.forEach(student => { balancedGroups[groupIndex % numGroups].push(student); groupIndex++; });
    return balancedGroups;
}
function createStudentGroupsByCount(students, groupCount) {
    const shuffledStudents = [...students]; shuffleArray(shuffledStudents); if (students.length === 0) return [];
    const groups = Array.from({ length: groupCount }, () => []); let groupIndex = 0;
    shuffledStudents.forEach(student => { groups[groupIndex % groupCount].push(student); groupIndex++; }); return groups;
}

// UPDATED: Initial Chart Generation (Checks active button)
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
    
    // Determine which mode is active
    let generatedGroups = [];
    const activeBtn = document.querySelector('.group-btn.active');
    
    if (activeBtn && activeBtn.id === 'generateGroupsByCountBtn') {
        const count = parseInt(groupCountInput.value, 10);
        generatedGroups = createStudentGroupsByCount(students, count);
    } else {
        // Default to Pairs (2) if no button is active yet, or use the active size
        let size = 2;
        if (activeBtn && activeBtn.dataset.groupsize) {
            size = parseInt(activeBtn.dataset.groupsize, 10);
        }
        generatedGroups = createStudentGroupsBySize(students, size);
    }

    seatingChartGrid.innerHTML = ''; 
    unselectedStudentsGrid.innerHTML = '';
    
    generatedGroups.forEach((group, index) => { 
        const color = groupColors[index % groupColors.length]; 
        seatingChartGrid.appendChild(createGroupContainerElement(group, color)); 
    });
    
    toggleDragAndDrop(false); 
    updateStudentCount(); 
    updateGroupNumbers();
}

function generateSelectiveChart() {
    const allStudents = Array.from(toolsContent.querySelectorAll('.seat')).map(seat => getStudentNameFromSeat(seat)); 
    const namesToRegroup = allStudents.filter(name => preselectedStudents.has(name) || participatedStudents.has(name));
    const unselectedNames = allStudents.filter(name => !preselectedStudents.has(name) && !participatedStudents.has(name));
    if (namesToRegroup.length === 0) { showErrorAlert("No students are selected."); return; }
    
    const activeModeBtn = document.querySelector('.group-btn.active');
    if (!activeModeBtn) { showErrorAlert("Select a grouping method."); return; }
    
    const mode = activeModeBtn.id; 
    let generatedGroups;
    
    if (mode === 'generateGroupsByCountBtn') { 
        const count = parseInt(groupCountInput.value, 10); 
        generatedGroups = createStudentGroupsByCount(namesToRegroup, count); 
    } else { 
        const size = parseInt(activeModeBtn.dataset.groupsize, 10); 
        generatedGroups = createStudentGroupsBySize(namesToRegroup, size); 
    }
    
    seatingChartGrid.innerHTML = ''; 
    unselectedStudentsGrid.innerHTML = '';
    
    generatedGroups.forEach((group, index) => { 
        const color = groupColors[index % groupColors.length]; 
        seatingChartGrid.appendChild(createGroupContainerElement(group, color)); 
    });
    
    unselectedNames.forEach(name => { unselectedStudentsGrid.appendChild(createSeatElement(name)); });
    
    updateJigsawButtonVisibility(); 
    toggleDragAndDrop(!attendanceVisible); 
    applyAttendanceStyles(); 
    updateStudentCount(); 
    updateGroupNumbers();
}

function createSeatElement(studentName) {
    const seat = document.createElement('div');
    seat.className = 'seat draggable-item bg-white p-2 border border-gray-300 rounded-md shadow-sm text-center text-sm flex flex-col items-center justify-center min-h-[60px] font-semibold cursor-pointer';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'student-name pointer-events-none';
    nameSpan.textContent = studentName;
    seat.appendChild(nameSpan);
    return seat;
}

function createGroupContainerElement(group, color) {
    const container = document.createElement('div'); container.className = 'group-container draggable-item'; container.style.backgroundColor = color.bg; container.style.borderColor = color.border;
    const size = group.length; let internalCols = (size <= 4) ? 2 : (size <= 6) ? 3 : 4; let parentSpan = (size <= 4) ? 2 : (size <= 6) ? 3 : 4;
    container.style.gridTemplateColumns = `repeat(${internalCols}, 1fr)`; container.style.gridColumn = `span ${parentSpan}`;
    group.forEach(studentName => container.appendChild(createSeatElement(studentName))); return container;
}

function updateJigsawButtonVisibility() {
    if (inClassButtons && !inClassButtons.classList.contains('hidden')) {
        const groups = Array.from(seatingChartGrid.querySelectorAll('.group-container'));
        const allGroupsAreBigEnough = groups.every(group => group.querySelectorAll('.seat').length >= 2);
        const canJigsaw = groups.length >= 2 && allGroupsAreBigEnough;
        jigsawBtn.classList.toggle('hidden', !canJigsaw);
    } else { jigsawBtn.classList.add('hidden'); }
}

function generateJigsawGroups() {
    const originalGroups = [];
    seatingChartGrid.querySelectorAll('.group-container').forEach(container => {
        originalGroups.push(Array.from(container.querySelectorAll('.seat')).map(seat => getStudentNameFromSeat(seat))); 
    });
    if (originalGroups.length < 2 || originalGroups.some(g => g.length < 2)) { showErrorAlert("Jigsaw requires 2+ groups of 2+ students."); return; }
    const maxGroupSize = Math.max(...originalGroups.map(g => g.length));
    const tempGroups = Array.from({ length: maxGroupSize }, () => []);
    originalGroups.forEach(originalGroup => { originalGroup.forEach((student, index) => { tempGroups[index].push(student); }); });
    const finalGroups = []; const leftovers = [];
    tempGroups.forEach(group => { if (group.length <= 1) leftovers.push(...group); else finalGroups.push(group); });
    if (finalGroups.length > 0) { let i = 0; leftovers.forEach(student => { finalGroups[i % finalGroups.length].push(student); i++; }); } else if (leftovers.length > 0) finalGroups.push(leftovers);
    seatingChartGrid.innerHTML = '';
    finalGroups.forEach((group, index) => { const color = groupColors[index % groupColors.length]; seatingChartGrid.appendChild(createGroupContainerElement(group, color)); });
    toggleDragAndDrop(!attendanceVisible); applyAttendanceStyles(); updateJigsawButtonVisibility(); updateGroupNumbers();
}

// --- MAIN INIT ---
async function initializePageSpecificApp() {
    cacheToolsDOMElements();
    initializeQuill();
    
    modeTextBtn.addEventListener('click', showTextMode);
    modeEmbedBtn.addEventListener('click', showEmbedMode);
    loadEmbedBtn.addEventListener('click', loadEmbedUrl);
    showToolbarBtn.addEventListener('click', toggleQuillToolbar); // Update listener
    toggleInstructionsBtn.addEventListener('click', toggleInstructions);
    
    // BG Menu Listeners
    bgColorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        bgColorMenu.classList.toggle('hidden');
    });
    
    // Header Collapse Listeners
    hideHeaderBtn.addEventListener('click', () => toggleHeaderVisibility(false));
    showHeaderBtn.addEventListener('click', () => toggleHeaderVisibility(true));

    // Full Screen Listener
    toggleFullScreenBtn.addEventListener('click', toggleFullScreen);
    
    // NEW: App Full Screen Listener
    appFullScreenBtn.addEventListener('click', toggleAppFullScreen);

    // Roles Listeners
    rolesBtn.addEventListener('click', () => { 
        const isHidden = rolesPanel.classList.toggle('hidden');
        toggleButtonState('rolesBtn', !isHidden);
        if(!isHidden) { renderRolesUI(); toggleRolesPanelState(false); }
    });
    closeRolesBtn.addEventListener('click', () => {
        rolesPanel.classList.add('hidden');
        toggleButtonState('rolesBtn', false);
    });
    addCustomRoleBtn.addEventListener('click', handleCustomRoleAdd);
    customRoleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleCustomRoleAdd(); });
    assignRolesBtn.addEventListener('click', assignRolesToGroups);
    shiftRolesBtn.addEventListener('click', shiftRoles);
    clearRolesBtn.addEventListener('click', clearRoles);
    toggleRolesViewBtn.addEventListener('click', () => toggleRolesPanelState(!isRolesPanelCollapsed));
    miniShiftBtn.addEventListener('click', shiftRoles);

    // Group Number Listeners
    groupNumBtn.addEventListener('click', () => {
        const isHidden = groupsPanel.classList.toggle('hidden');
        toggleButtonState('groupNumBtn', !isHidden);
        isGroupNumbersVisible = !isHidden;
        updateGroupNumbers();
    });
    closeGroupsBtn.addEventListener('click', () => {
        groupsPanel.classList.add('hidden');
        toggleButtonState('groupNumBtn', false);
        isGroupNumbersVisible = false;
        updateGroupNumbers();
    });
    rotateGroupsBtn.addEventListener('click', rotateGroups);

    // More Menu Listeners
    moreOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreOptionsMenu.classList.toggle('hidden');
    });

    // Timer Button Listeners (NEW)
    minUpBtn.addEventListener('click', () => adjustTimerMinutes(1));
    minDownBtn.addEventListener('click', () => adjustTimerMinutes(-1));

    // UPDATED: Group Button Listeners (Context Aware)
    groupBtns.forEach(btn => btn.disabled = true);
    groupBtns.forEach(btn => { 
        btn.addEventListener('click', (e) => { 
            updateActiveButton(e.currentTarget); 
            if (!classStarted) {
                generateInitialChart(); // Regenerate all
            } else {
                generateSelectiveChart(); // Regroup selected
            }
        }); 
    });
    
    // UPDATED: Group Count Input Listener
    groupCountInput.addEventListener('change', () => {
       if (!classStarted && document.getElementById('generateGroupsByCountBtn').classList.contains('active')) {
           generateInitialChart();
       }
    });

    classDropdown.addEventListener('change', generateInitialChart);

    toolsContent.addEventListener('contextmenu', (event) => {
        const seat = event.target.closest('.seat'); if (!seat) return;
        event.preventDefault();
        const studentName = getStudentNameFromSeat(seat); 
        const menuHtml = `<button class="context-menu-btn" data-action="markPresent" data-student="${studentName}">Mark as Present (Green)</button><button class="context-menu-btn" data-action="markTardy" data-student="${studentName}">Mark as Tardy (Yellow)</button><div class="context-menu-divider"></div><button class="context-menu-btn" data-action="deselect" data-student="${studentName}">Deselect</button>`;
        seatContextMenu.innerHTML = menuHtml;
        seatContextMenu.style.top = `${event.pageY}px`; seatContextMenu.style.left = `${event.pageX}px`;
        seatContextMenu.classList.remove('hidden');
    });

    seatContextMenu.addEventListener('click', (event) => {
        const button = event.target.closest('.context-menu-btn'); if (!button) return;
        const { action, student } = button.dataset;
        if (action === 'markPresent') { participatedStudents.delete(student); preselectedStudents.add(student); }
        else if (action === 'markTardy') { preselectedStudents.delete(student); participatedStudents.add(student); }
        else if (action === 'deselect') { preselectedStudents.delete(student); participatedStudents.delete(student); }
        applyAttendanceStyles(); seatContextMenu.classList.add('hidden');
    });

    document.addEventListener('click', (event) => {
        if (event.target.closest('#seatContextMenu')) return;
        if (!seatContextMenu.classList.contains('hidden')) seatContextMenu.classList.add('hidden');
        
        if (!moreOptionsBtn.contains(event.target) && !moreOptionsMenu.contains(event.target)) {
            moreOptionsMenu.classList.add('hidden');
        }
        
        if (bgColorMenu && !bgColorBtn.contains(event.target) && !bgColorMenu.contains(event.target)) {
            bgColorMenu.classList.add('hidden');
        }

        const seat = event.target.closest('.seat');
        if (seat) {
            const studentName = getStudentNameFromSeat(seat); 
            if (classStarted) {
                if (preselectedStudents.has(studentName)) preselectedStudents.delete(studentName);
                else if (participatedStudents.has(studentName)) participatedStudents.delete(studentName);
                else participatedStudents.add(studentName);
            } else {
                if (preselectedStudents.has(studentName)) preselectedStudents.delete(studentName);
                else preselectedStudents.add(studentName);
            }
            applyAttendanceStyles();
        }
    });

    jigsawBtn.addEventListener('click', generateJigsawGroups);
    selectAllBtn.addEventListener('click', () => { toolsContent.querySelectorAll('.seat').forEach(seat => preselectedStudents.add(getStudentNameFromSeat(seat))); applyAttendanceStyles(); }); 
    deselectAllBtn.addEventListener('click', () => { preselectedStudents.clear(); participatedStudents.clear(); applyAttendanceStyles(); });
    
    startClassBtn.addEventListener('click', () => {
        classStarted = true; originalSeating = captureSeatingState();
        setupButtons.classList.add('hidden'); inClassButtons.classList.remove('hidden');
        originalSeatingBtn.disabled = false; preselectedStudents.clear();
        toolsContent.querySelectorAll('.seat.selected').forEach(seat => preselectedStudents.add(getStudentNameFromSeat(seat))); 
        updateJigsawButtonVisibility(); showSuccessAlert("Class started!");
    });

    originalSeatingBtn.addEventListener('click', () => { if (originalSeating) renderSeatingState(originalSeating); });
    
    attendanceToggleBtn.addEventListener('click', () => { 
        attendanceVisible = !attendanceVisible; 
        
        if (attendanceVisible) {
            iconToArrange.classList.add('hidden');
            iconToAttendance.classList.remove('hidden');
        } else {
            iconToArrange.classList.remove('hidden');
            iconToAttendance.classList.add('hidden');
        }
        
        toggleDragAndDrop(!attendanceVisible); 
        applyAttendanceStyles(); 
    });

    showTimerBtn.addEventListener('click', () => {
        const isHidden = timerContainer.classList.toggle('hidden');
        toggleButtonState('showTimerBtn', !isHidden);
    });
    timerHideBtn.addEventListener('click', () => {
        timerContainer.classList.add('hidden');
        toggleButtonState('showTimerBtn', false);
        stopTimerSound();
    });
    timerPlayPauseBtn.addEventListener('click', () => { if (timerInterval) pauseTimer(); else playTimer(); });
    timerResetBtn.addEventListener('click', resetTimer);

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            await fetchAllStudentData(); populateCourseDropdownFromData();
            populateDropdown('classDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            classDropdown.removeAttribute("disabled"); groupBtns.forEach(btn => btn.disabled = false); updateActiveButton(generatePairsBtn);
        } catch (error) { showErrorAlert("Could not load class data."); }
    }
}

function resetPageSpecificAppState() {
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
    classStarted = false; originalSeating = null; attendanceVisible = true;
    preselectedStudents.clear(); participatedStudents.clear();
    activeRoles = []; roleRotationIndex = 0;
    if (setupButtons) setupButtons.classList.remove('hidden');
    if (inClassButtons) inClassButtons.classList.add('hidden');
    if (classDropdown) populateDropdown('classDropdown', [], DEFAULT_CLASS_OPTION, "");
    if (seatingChartGrid) seatingChartGrid.innerHTML = '';
    if (unselectedStudentsGrid) unselectedStudentsGrid.innerHTML = '';
    if (studentCountDisplay) studentCountDisplay.textContent = "";
    // Reset widget visibility
    if (timerContainer) timerContainer.classList.add('hidden');
    if (rolesPanel) rolesPanel.classList.add('hidden');
    if (groupsPanel) groupsPanel.classList.add('hidden');
    if (instructionContainer) instructionContainer.classList.add('hidden');
    isGroupNumbersVisible = false;
    toggleButtonState('showTimerBtn', false);
    toggleButtonState('rolesBtn', false);
    toggleButtonState('groupNumBtn', false);
    toggleButtonState('toggleInstructionsBtn', false);
}