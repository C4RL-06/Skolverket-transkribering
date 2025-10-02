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
        .map(speaker => `<span class="speaker-tag">${speaker}</span>`)
        .join('');
    
    const transcriptionEntriesHtml = selectedTranscription.transcribedText
        .map(entry => `
            <div class="transcription-entry">
                <div class="entry-timestamp">${formatTimestamp(entry.timestamp)}</div>
                <div class="entry-content">
                    <div class="entry-speaker">${entry.speaker}</div>
                    <div class="entry-text">${entry.text}</div>
                </div>
            </div>
        `).join('');
    
    contentContainer.innerHTML = `
        <div class="content-header">
            <h1 class="content-title">${selectedTranscription.title}</h1>
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

// Initialize the app when PyWebview is ready
document.addEventListener('DOMContentLoaded', function() {
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
