// =====================================
// D&D CHARACTER SHEET - MAIN JAVASCRIPT
// =====================================

// Global variables
let currentCharacterSlot = 1;
let characters = {};
let autoSaveInterval;
let deferredPrompt; // For PWA install

// =====================================
// APP INITIALIZATION
// =====================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎲 D&D Character Sheet loading...');
    
    initializeApp();
    loadCharacterSlots();
    setupEventListeners();
    initializePWA();
    startAutoSave();
    
    console.log('✅ D&D Character Sheet ready!');
});

function initializeApp() {
    // Load saved characters from localStorage
    const savedCharacters = localStorage.getItem('dndCharacters');
    if (savedCharacters) {
        characters = JSON.parse(savedCharacters);
        console.log('📂 Loaded characters:', Object.keys(characters).length);
    }
    
    // Set initial character slot
    loadCharacterSlot(currentCharacterSlot);
    updateCharacterSlotDisplay();
}

// =====================================
// NAVIGATION SYSTEM
// =====================================

function setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            navigateToPage(page);
            
            // Update active state
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Character slots
    document.querySelectorAll('.character-slot').forEach(slot => {
        slot.addEventListener('click', function() {
            const slotNumber = parseInt(this.dataset.slot);
            switchCharacterSlot(slotNumber);
        });
    });
    
    // Character action buttons
    document.getElementById('new-character-btn').addEventListener('click', createNewCharacter);
    document.getElementById('save-character-btn').addEventListener('click', saveCurrentCharacter);
    document.getElementById('load-character-btn').addEventListener('click', loadCharacterDialog);
    document.getElementById('export-character-btn').addEventListener('click', exportCharacter);
    document.getElementById('import-character-btn').addEventListener('click', importCharacter);
    
    // Quick character info auto-save
    document.querySelectorAll('.quick-name-input, .quick-input').forEach(input => {
        input.addEventListener('input', function() {
            updateQuickCharacterInfo();
            scheduleAutoSave();
        });
    });
    
    // PWA Install prompt
    document.getElementById('install-yes').addEventListener('click', installPWA);
    document.getElementById('install-no').addEventListener('click', dismissInstallPrompt);
    
    // Online/offline status
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
}

function navigateToPage(page) {
    const iframe = document.getElementById('content-frame');
    const pageMap = {
        'stats': 'data/stats.html',
        'equipment': 'data/equipment.html', 
        'spells': 'data/spells_skills.html',
        'notes': 'data/notes.html'
    };
    
    if (pageMap[page]) {
        iframe.src = pageMap[page];
        console.log(`📄 Navigated to: ${page}`);
    }
}

// =====================================
// CHARACTER MANAGEMENT
// =====================================

function createNewCharacter() {
    if (confirm('Create a new character? This will clear current data.')) {
        // Clear current character data
        characters[currentCharacterSlot] = createEmptyCharacter();
        updateCharacterDisplay();
        updateCharacterSlotDisplay();
        
        // Clear all iframe content
        const iframe = document.getElementById('content-frame');
        iframe.contentWindow.location.reload();
        
        updateSaveStatus('🆕 New character created');
        console.log('🆕 Created new character in slot', currentCharacterSlot);
    }
}

function createEmptyCharacter() {
    return {
        basicInfo: {
            name: '',
            level: 1,
            class: '',
            species: '',
            background: '',
            xp: 0
        },
        abilities: {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10
        },
        combat: {
            armorClass: 10,
            currentHP: 0,
            maxHP: 0,
            tempHP: 0,
            speed: 30,
            proficiencyBonus: 2
        },
        equipment: {
            weapons: [],
            armor: [],
            inventory: [],
            currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }
        },
        spells: {
            spellcastingAbility: '',
            spellSlots: {},
            knownSpells: [],
            preparedSpells: []
        },
        notes: {
            appearance: {},
            personality: {},
            backstory: {},
            relationships: [],
            campaignNotes: {}
        },
        lastModified: new Date().toISOString()
    };
}

function saveCurrentCharacter() {
    if (!characters[currentCharacterSlot]) {
        characters[currentCharacterSlot] = createEmptyCharacter();
    }
    
    // Update character with quick info
    updateCharacterFromQuickInfo();
    
    // Save to localStorage
    characters[currentCharacterSlot].lastModified = new Date().toISOString();
    localStorage.setItem('dndCharacters', JSON.stringify(characters));
    
    updateCharacterSlotDisplay();
    updateSaveStatus('💾 Character saved');
    console.log('💾 Saved character slot', currentCharacterSlot);
}

function loadCharacterSlot(slotNumber) {
    currentCharacterSlot = slotNumber;
    
    if (characters[slotNumber]) {
        const character = characters[slotNumber];
        
        // Update quick info display
        document.getElementById('quick-char-name').value = character.basicInfo.name || '';
        document.getElementById('quick-level').value = character.basicInfo.level || 1;
        document.getElementById('quick-class').value = character.basicInfo.class || '';
        document.getElementById('quick-current-hp').value = character.combat.currentHP || 0;
        document.getElementById('quick-max-hp').value = character.combat.maxHP || 0;
        
        updateSaveStatus('📂 Character loaded');
        console.log('📂 Loaded character from slot', slotNumber);
    } else {
        // Empty slot - create new character
        characters[slotNumber] = createEmptyCharacter();
        updateCharacterDisplay();
    }
    
    updateCharacterSlotDisplay();
}

function switchCharacterSlot(slotNumber) {
    if (slotNumber === currentCharacterSlot) return;
    
    // Save current character first
    saveCurrentCharacter();
    
    // Switch to new slot
    loadCharacterSlot(slotNumber);
    
    // Reload iframe content to reflect new character
    const iframe = document.getElementById('content-frame');
    iframe.contentWindow.location.reload();
}

function updateCharacterFromQuickInfo() {
    if (!characters[currentCharacterSlot]) return;
    
    const character = characters[currentCharacterSlot];
    character.basicInfo.name = document.getElementById('quick-char-name').value;
    character.basicInfo.level = parseInt(document.getElementById('quick-level').value) || 1;
    character.basicInfo.class = document.getElementById('quick-class').value;
    character.combat.currentHP = parseInt(document.getElementById('quick-current-hp').value) || 0;
    character.combat.maxHP = parseInt(document.getElementById('quick-max-hp').value) || 0;
}

function updateCharacterDisplay() {
    // Clear quick info for new character
    document.getElementById('quick-char-name').value = '';
    document.getElementById('quick-level').value = 1;
    document.getElementById('quick-class').value = '';
    document.getElementById('quick-current-hp').value = 0;
    document.getElementById('quick-max-hp').value = 0;
}

function updateQuickCharacterInfo() {
    // This function is called when quick info is changed
    // It ensures the character object is updated in real-time
    updateCharacterFromQuickInfo();
}

// =====================================
// CHARACTER SLOT DISPLAY
// =====================================

function loadCharacterSlots() {
    updateCharacterSlotDisplay();
}

function updateCharacterSlotDisplay() {
    for (let i = 1; i <= 5; i++) {
        const slot = document.querySelector(`[data-slot="${i}"]`);
        const nameElement = document.getElementById(`slot-${i}-name`);
        const classElement = document.getElementById(`slot-${i}-class`);
        const levelElement = document.getElementById(`slot-${i}-level`);
        
        // Remove all slot states
        slot.classList.remove('active', 'occupied', 'empty');
        
        if (characters[i] && characters[i].basicInfo.name) {
            // Occupied slot
            slot.classList.add('occupied');
            nameElement.textContent = characters[i].basicInfo.name;
            classElement.textContent = characters[i].basicInfo.class || 'Unknown Class';
            levelElement.textContent = `Lv ${characters[i].basicInfo.level || 1}`;
        } else {
            // Empty slot
            slot.classList.add('empty');
            nameElement.textContent = 'Empty Slot';
            classElement.textContent = '-';
            levelElement.textContent = '-';
        }
        
        // Mark current slot as active
        if (i === currentCharacterSlot) {
            slot.classList.add('active');
        }
    }
}

// =====================================
// IMPORT/EXPORT FUNCTIONALITY
// =====================================

function exportCharacter() {
    if (!characters[currentCharacterSlot]) {
        alert('No character to export');
        return;
    }
    
    updateCharacterFromQuickInfo();
    const character = characters[currentCharacterSlot];
    const exportData = {
        character: character,
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${character.basicInfo.name || 'character'}_${character.basicInfo.level || 1}.json`;
    link.click();
    
    updateSaveStatus('📄 Character exported');
    console.log('📄 Exported character:', character.basicInfo.name);
}

function importCharacter() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (importData.character) {
                    characters[currentCharacterSlot] = importData.character;
                    loadCharacterSlot(currentCharacterSlot);
                    
                    // Reload iframe to show imported character
                    const iframe = document.getElementById('content-frame');
                    iframe.contentWindow.location.reload();
                    
                    updateSaveStatus('📁 Character imported');
                    console.log('📁 Imported character:', importData.character.basicInfo.name);
                } else {
                    alert('Invalid character file format');
                }
            } catch (error) {
                alert('Error reading character file: ' + error.message);
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

function loadCharacterDialog() {
    // For now, just show character slots
    alert('Character loading: Click on any character slot above to switch to that character.');
}

// =====================================
// AUTO-SAVE FUNCTIONALITY
// =====================================

function startAutoSave() {
    // Auto-save every 30 seconds
    autoSaveInterval = setInterval(() => {
        if (characters[currentCharacterSlot]) {
            saveCurrentCharacter();
        }
    }, 30000);
}

function scheduleAutoSave() {
    // Debounced auto-save after 2 seconds of no input
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(() => {
        saveCurrentCharacter();
    }, 2000);
}

function updateSaveStatus(message) {
    const statusElement = document.getElementById('save-status');
    statusElement.textContent = message;
    
    // Reset to "Ready" after 3 seconds
    setTimeout(() => {
        statusElement.textContent = '💾 Ready';
    }, 3000);
}

// =====================================
// PWA FUNCTIONALITY
// =====================================

function initializePWA() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('✅ Service Worker registered successfully');
            })
            .catch(error => {
                console.log('❌ Service Worker registration failed:', error);
            });
    }
    
    // PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt();
    });
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('📱 PWA is installed and running in standalone mode');
    }
}

function showInstallPrompt() {
    const installPrompt = document.getElementById('install-prompt');
    installPrompt.classList.remove('hidden');
    
    setTimeout(() => {
        installPrompt.classList.add('hidden');
    }, 10000); // Hide after 10 seconds
}

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('📱 User accepted PWA install');
            }
            deferredPrompt = null;
        });
    }
    dismissInstallPrompt();
}

function dismissInstallPrompt() {
    document.getElementById('install-prompt').classList.add('hidden');
}

// =====================================
// UTILITY FUNCTIONS
// =====================================

function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (navigator.onLine) {
        statusElement.textContent = '🌐 Online';
        statusElement.style.color = '#228B22';
    } else {
        statusElement.textContent = '📴 Offline';
        statusElement.style.color = '#DC143C';
    }
}

// Initialize connection status
updateConnectionStatus();

// =====================================
// CHARACTER DATA API FOR IFRAMES
// =====================================

// These functions can be called by the iframe pages to get/set character data
window.getCharacterData = function() {
    return characters[currentCharacterSlot] || createEmptyCharacter();
};

window.updateCharacterData = function(newData) {
    if (!characters[currentCharacterSlot]) {
        characters[currentCharacterSlot] = createEmptyCharacter();
    }
    
    // Merge new data with existing character
    characters[currentCharacterSlot] = { ...characters[currentCharacterSlot], ...newData };
    characters[currentCharacterSlot].lastModified = new Date().toISOString();
    
    // Update quick info if basic info changed
    if (newData.basicInfo) {
        const character = characters[currentCharacterSlot];
        document.getElementById('quick-char-name').value = character.basicInfo.name || '';
        document.getElementById('quick-level').value = character.basicInfo.level || 1;
        document.getElementById('quick-class').value = character.basicInfo.class || '';
    }
    
    if (newData.combat) {
        const character = characters[currentCharacterSlot];
        document.getElementById('quick-current-hp').value = character.combat.currentHP || 0;
        document.getElementById('quick-max-hp').value = character.combat.maxHP || 0;
    }
    
    updateCharacterSlotDisplay();
    scheduleAutoSave();
};

// =====================================
// CLEANUP ON PAGE UNLOAD
// =====================================

window.addEventListener('beforeunload', function() {
    // Final save before leaving
    if (characters[currentCharacterSlot]) {
        updateCharacterFromQuickInfo();
        localStorage.setItem('dndCharacters', JSON.stringify(characters));
    }
    
    // Clear intervals
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
});

// =====================================
// DEVELOPMENT HELPERS
// =====================================

// Expose some functions for debugging
window.dndDebug = {
    characters,
    currentCharacterSlot,
    exportAllCharacters: () => JSON.stringify(characters, null, 2),
    clearAllData: () => {
        localStorage.removeItem('dndCharacters');
        location.reload();
    },
    createTestCharacter: () => {
        const testChar = createEmptyCharacter();
        testChar.basicInfo.name = 'Test Warrior';
        testChar.basicInfo.class = 'Fighter';
        testChar.basicInfo.level = 5;
        testChar.combat.maxHP = 45;
        testChar.combat.currentHP = 35;
        characters[currentCharacterSlot] = testChar;
        loadCharacterSlot(currentCharacterSlot);
        console.log('🧪 Test character created');
    }
};

console.log('🔧 Debug tools available: window.dndDebug');