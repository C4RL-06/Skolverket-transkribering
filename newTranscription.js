document.addEventListener('DOMContentLoaded', function() {
    const fileDropZone = document.querySelector('.file-drop-zone');
    const fileDropContent = document.querySelector('.file-drop-content p');
    const fileInput = document.getElementById('fileInput');
    const fileUploadContainer = document.querySelector('.file-upload-container');
    
    // Store file data for tracking progress
    const fileData = new Map();
    let fileCardsContainer = null;

    // Function to create file cards container if it doesn't exist
    function ensureFileCardsContainer() {
        if (!fileCardsContainer) {
            fileCardsContainer = document.createElement('div');
            fileCardsContainer.className = 'file-cards-container';
            fileUploadContainer.insertBefore(fileCardsContainer, fileDropZone);
        }
        return fileCardsContainer;
    }

    // Function to remove file cards container if empty
    function cleanupFileCardsContainer() {
        if (fileCardsContainer && fileCardsContainer.children.length === 0) {
            fileCardsContainer.remove();
            fileCardsContainer = null;
        }
    }

    // Function to get file icon based on extension
    function getFileIcon(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            'mp3': 'fa-file-audio',
            'wav': 'fa-file-audio',
            'mp4': 'fa-file-video',
            'avi': 'fa-file-video',
            'mov': 'fa-file-video',
            'm4a': 'fa-file-audio',
            'flac': 'fa-file-audio',
            'ogg': 'fa-file-audio'
        };
        return iconMap[extension] || 'fa-file';
    }

    // Function to create a file card
    function createFileCard(fileName, filePath) {
        const fileCard = document.createElement('div');
        fileCard.className = 'file-card';
        fileCard.dataset.fileName = fileName;
        fileCard.dataset.filePath = filePath;
        
        const fileIcon = getFileIcon(fileName);
        
        fileCard.innerHTML = `
            <div class="file-card-info">
                <i class="fa-solid ${fileIcon} file-icon"></i>
                <span class="file-name">${fileName}</span>
            </div>
            <div class="file-status">
                <span class="progress-percentage">0%</span>
                <i class="fa-solid fa-check completion-checkmark"></i>
                <button class="remove-file-btn" title="Remove file">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        
        // Add click handler for remove button
        const removeBtn = fileCard.querySelector('.remove-file-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(fileName);
        });
        
        return fileCard;
    }

    // Function to remove a file
    function removeFile(fileName) {
        // Remove from file data
        fileData.delete(fileName);
        
        // Remove the file card from DOM
        if (fileCardsContainer) {
            const fileCard = fileCardsContainer.querySelector(`[data-file-name="${fileName}"]`);
            if (fileCard) {
                fileCard.remove();
            }
            
            // Clean up container if empty
            cleanupFileCardsContainer();
        }
        
        console.log(`File removed: ${fileName}`);
    }

    // Function to update file progress
    function updateFileProgress(fileName, progress) {
        if (!fileCardsContainer) return;
        
        const fileCard = fileCardsContainer.querySelector(`[data-file-name="${fileName}"]`);
        if (fileCard) {
            const progressElement = fileCard.querySelector('.progress-percentage');
            if (progress >= 100) {
                fileCard.classList.add('completed');
                // Update file data
                if (fileData.has(fileName)) {
                    fileData.get(fileName).progress = 100;
                    fileData.get(fileName).completed = true;
                }
            } else {
                fileCard.classList.remove('completed');
                progressElement.textContent = `${Math.round(progress)}%`;
                // Update file data
                if (fileData.has(fileName)) {
                    fileData.get(fileName).progress = progress;
                    fileData.get(fileName).completed = false;
                }
            }
        }
    }

    // Function to handle file selection
    function handleFileSelect(filePath) {
        if (filePath && filePath.length > 0) {
            // In pywebview, the dialog returns a tuple/list. Handle multiple files.
            const fileNames = filePath.map(path => path.split('\\').pop().split('/').pop());
            
            // Ensure file cards container exists
            ensureFileCardsContainer();
            
            // Create file cards for each selected file
            fileNames.forEach((fileName, index) => {
                const fileCard = createFileCard(fileName, filePath[index]);
                fileCardsContainer.appendChild(fileCard);
                
                // Store file data
                fileData.set(fileName, {
                    path: filePath[index],
                    progress: 0,
                    completed: false
                });
            });
            
            console.log('Files selected:', filePath);
        } else {
            console.log('File selection cancelled.');
        }
    }

    // --- Event Listeners ---

    // Listen for clicks on the drop zone
    fileDropZone.addEventListener('click', () => {
        // Call the Python API to open a file dialog
        pywebview.api.openFileDialog().then(handleFileSelect);
    });

    // Basic drag-and-drop visual feedback
    fileDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropZone.classList.add('drag-over');
    });

    fileDropZone.addEventListener('dragleave', () => {
        fileDropZone.classList.remove('drag-over');
    });

    fileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropZone.classList.remove('drag-over');
        // pywebview's drag-and-drop gives file paths directly
        if (e.dataTransfer.files.length > 0) {
            // The 'files' object on drop is a list of paths
            const paths = Array.from(e.dataTransfer.files).map(f => f.path);
            handleFileSelect(paths);
        }
    });

    // Make functions available globally for transcription progress updates
    window.updateFileProgress = updateFileProgress;
    window.getFileData = () => fileData;
});