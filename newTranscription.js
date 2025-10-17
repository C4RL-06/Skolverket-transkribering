document.addEventListener('DOMContentLoaded', function() {
    const fileDropZone = document.querySelector('.file-drop-zone');
    const fileDropContent = document.querySelector('.file-drop-content p');
    const fileInput = document.getElementById('fileInput');

    // Function to handle file selection
    function handleFileSelect(filePath) {
        if (filePath && filePath.length > 0) {
            // In pywebview, the dialog returns a tuple/list. Handle multiple files.
            const fileNames = filePath.map(path => path.split('\\').pop().split('/').pop());
            
            if (fileNames.length === 1) {
                fileDropContent.textContent = `Selected file: ${fileNames[0]}`;
            } else {
                fileDropContent.textContent = `Selected ${fileNames.length} files: ${fileNames.join(', ')}`;
            }
            
            console.log('Files selected:', filePath);
        } else {
            fileDropContent.textContent = 'Choose audio and video files';
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
});