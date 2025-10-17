let transcriptionsData = [];
let selectedTranscription = null;

// Format timestamp from HH:MM:SS to clean format (0:10, 10:00, 1:00:00, etc.)
function formatTimestamp(timestamp) {
    const parts = timestamp.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseInt(parts[2]);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (minutes >= 10) {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Load transcription files from the folder
async function loadTranscriptions() {
    try {
        console.log('Starting to load transcriptions...');
        
        const fileList = await pywebview.api.getTranscriptionFiles();
        console.log('Found files:', fileList);
        
        transcriptionsData = [];
        for (const filename of fileList) {
            console.log('Loading file:', filename);
            const transcriptionResponse = await fetch(`transcription files/${filename}`);
            if (!transcriptionResponse.ok) {
                console.error(`Failed to fetch ${filename}:`, transcriptionResponse.status);
                continue;
            }
            const transcriptionData = await transcriptionResponse.json();
            // Store the original filename with the transcription data
            transcriptionData._filename = filename;
            transcriptionsData.push(transcriptionData);
        }
        
        console.log('Loaded transcriptions:', transcriptionsData.length);
        renderTranscriptionList();
    } catch (error) {
        console.error('Error loading transcriptions:', error);
    }
}

// Render the list of transcriptions in the left panel
function renderTranscriptionList() {
    console.log('Rendering transcription list with', transcriptionsData.length, 'items');
    const listContainer = document.getElementById('transcriptionList');
    listContainer.innerHTML = '';

    transcriptionsData.forEach((transcription, index) => {
        console.log('Creating card for:', transcription.title);
        const card = createTranscriptionCard(transcription, index);
        listContainer.appendChild(card);
    });
}

// Create a transcription card element
function createTranscriptionCard(transcription, index) {
    const card = document.createElement('div');
    card.className = 'transcription-card';
    card.onclick = () => selectTranscription(index);
    
    card.innerHTML = `
        <div class="card-title">${transcription.title}</div>
        <div class="card-date">${transcription.date}</div>
    `;
    
    return card;
}

// Select and display a transcription
function selectTranscription(index) {
    selectedTranscription = transcriptionsData[index];
    
    // Selected card styling :p
    document.querySelectorAll('.transcription-card').forEach((card, i) => {
        card.classList.toggle('active', i === index);
    });
    
    renderTranscriptionContent();
}

// Show the selected transcription file in the right panel
function renderTranscriptionContent() {
    const contentContainer = document.getElementById('transcriptionContent');
    
    if (!selectedTranscription) {
        contentContainer.innerHTML = `
            <div class="empty-state">
                <h2>Välj en transkribering</h2>
                <p>Välj en transkribering från vänster panel för att visa innehållet</p>
            </div>
        `;
        return;
    }
    
    const speakersHtml = selectedTranscription.speakers
        .map((speaker, index) => `<span class="speaker-tag editable-speaker" onclick="editSpeaker(this, ${index})">${speaker}</span>`)
        .join('');
    
    const transcriptionEntriesHtml = selectedTranscription.transcribedText
        .map(entry => `
            <div class="transcription-entry">
                <div class="entry-timestamp">${formatTimestamp(entry.timestamp)}</div>
                <div class="entry-content">
                    <div class="entry-speaker">${selectedTranscription.speakers[entry.speakerIndex]}</div>
                    <div class="entry-text">${entry.text}</div>
                </div>
            </div>
        `).join('');
    
    contentContainer.innerHTML = `
        <div class="content-header">
            <h1 class="content-title editable-title" onclick="editTitle(this)">${selectedTranscription.title}</h1>
            <span class="content-date">${selectedTranscription.date}</span>
        </div>
        
        <div class="speakers-container">
            <div class="speakers-list">
                ${speakersHtml}
            </div>
        </div>
        
        <div class="transcription-content">
            ${transcriptionEntriesHtml}
        </div>
    `;
}

// Edit title functionality
function editTitle(titleElement) {
    const currentTitle = titleElement.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.className = 'title-editor';
    input.style.cssText = 'font-size: 24px; font-weight: 600; border: 2px solid #007bff; padding: 4px; border-radius: 4px; background: white;';
    
    titleElement.replaceWith(input);
    input.focus();
    input.select();
    
    function saveTitle() {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
            // Update the selected transcription
            selectedTranscription.title = newTitle;
            
            // Update the card in the left panel
            const activeCard = document.querySelector('.transcription-card.active .card-title');
            if (activeCard) {
                activeCard.textContent = newTitle;
            }
            
            // Save to JSON file
            saveTranscriptionToFile();
        }
        
        // Replace input with updated title
        const newTitleElement = document.createElement('h1');
        newTitleElement.className = 'content-title editable-title';
        newTitleElement.onclick = () => editTitle(newTitleElement);
        newTitleElement.textContent = selectedTranscription.title;
        input.replaceWith(newTitleElement);
    }
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveTitle();
        } else if (e.key === 'Escape') {
            // Cancel editing
            const titleElement = document.createElement('h1');
            titleElement.className = 'content-title editable-title';
            titleElement.onclick = () => editTitle(titleElement);
            titleElement.textContent = currentTitle;
            input.replaceWith(titleElement);
        }
    });
    
    input.addEventListener('blur', saveTitle);
}

// Edit speaker functionality
function editSpeaker(speakerElement, speakerIndex) {
    const currentName = speakerElement.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'speaker-editor';
    input.style.cssText = 'font-size: 14px; font-weight: 500; border: 2px solid #007bff; padding: 4px 8px; border-radius: 20px; background: white;';
    
    speakerElement.replaceWith(input);
    input.focus();
    input.select();
    
    function saveSpeaker() {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            // Update the speaker in the selected transcription
            selectedTranscription.speakers[speakerIndex] = newName;
            
            // Re-render the transcription content to update all speaker references
            renderTranscriptionContent();
            
            // Save to JSON file
            saveTranscriptionToFile();
        } else {
            // Replace input with original speaker element
            const newSpeakerElement = document.createElement('span');
            newSpeakerElement.className = 'speaker-tag editable-speaker';
            newSpeakerElement.onclick = () => editSpeaker(newSpeakerElement, speakerIndex);
            newSpeakerElement.textContent = currentName;
            input.replaceWith(newSpeakerElement);
        }
    }
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveSpeaker();
        } else if (e.key === 'Escape') {
            // Cancel editing
            const speakerElement = document.createElement('span');
            speakerElement.className = 'speaker-tag editable-speaker';
            speakerElement.onclick = () => editSpeaker(speakerElement, speakerIndex);
            speakerElement.textContent = currentName;
            input.replaceWith(speakerElement);
        }
    });
    
    input.addEventListener('blur', saveSpeaker);
}

// Save transcription to JSON file
async function saveTranscriptionToFile() {
    if (!selectedTranscription) return;
    
    try {
        // Find the filename for the current transcription
        const filename = getCurrentTranscriptionFilename();
        if (!filename) {
            console.error('Could not determine filename for current transcription');
            return;
        }
        
        // Create a copy without the _filename property for saving
        const transcriptionToSave = { ...selectedTranscription };
        delete transcriptionToSave._filename;
        
        const result = await pywebview.api.saveTranscription(filename, transcriptionToSave);
        if (result.success) {
            console.log('Transcription saved successfully');
        } else {
            console.error('Failed to save transcription:', result.message);
        }
    } catch (error) {
        console.error('Error saving transcription:', error);
    }
}

// Get filename for current transcription (use stored original filename)
function getCurrentTranscriptionFilename() {
    if (!selectedTranscription) return null;
    
    // Use the original filename that was stored when loading
    return selectedTranscription._filename || null;
}

// Initialize the app when PyWebview is ready
document.addEventListener('DOMContentLoaded', function() {
    const newTranscriptionBtn = document.getElementById('newTranscriptionBtn');
    if (newTranscriptionBtn) {
        newTranscriptionBtn.addEventListener('click', () => {
            window.location.href = 'newTranscription.html';
        });
    }

    // Wait for PyWebview to be ready before loading transcriptions
    if (typeof pywebview !== 'undefined' && pywebview.api) {
        loadTranscriptions();
    } else {
        // If pywebview isn't ready yet, wait for it
        window.addEventListener('pywebviewready', function() {
            console.log('PyWebview ready event fired');
            loadTranscriptions();
        });
    }
});
