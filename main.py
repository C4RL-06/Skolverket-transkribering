import webview
from webview import FileDialog
import os
import sys
import threading
import json
import glob
from pathlib import Path
from transcriber import TranscriptionEngine, TranscriptionJob, Language, ModelSize
import warnings
warnings.filterwarnings("ignore", message=".*set_audio_backend.*")

# Store engines outside the Api class to avoid serialization issues
_engine_cache = {}

class Api:
    def __init__(self):
        self.active_jobs = {}  # {file_path: {"progress": float, "status": str, "message": str}}
        self.processing_queue = []  # Queue for sequential processing
        self.is_processing = False  # Flag to prevent parallel processing
        self._queue_lock = threading.Lock()  # Lock for queue operations
    
    def _get_engine(self):
        """Get or create the transcription engine (stored outside instance to avoid serialization)."""
        engine_id = id(self)
        if engine_id not in _engine_cache:
            _engine_cache[engine_id] = TranscriptionEngine()
        return _engine_cache[engine_id]
    
    def getTranscriptionFiles(self):
        json_files = glob.glob('transcription files/*.json')
        return [os.path.basename(file) for file in json_files]
    
    def saveTranscription(self, filename, transcriptionData):
        try:
            filepath = os.path.join('transcription files', filename)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(transcriptionData, f, indent=2, ensure_ascii=False)
            return {"success": True, "message": "Transcription saved successfully"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def openFileDialog(self):
        """Open a file dialog and return the selected file path"""
        file_types = ('Video and Audio Files (*.mp4;*.avi;*.mkv;*.mov;*.wmv;*.flv;*.webm;*.m4v;*.mp3;*.wav;*.m4a;*.flac;*.aac;*.ogg;*.wma;*.aiff)', 'All files (*.*)')
        result = window.create_file_dialog(FileDialog.OPEN, allow_multiple=True, file_types=file_types)
        return result
    
    def getAllProgress(self):
        """Get progress for all active jobs."""
        return self.active_jobs
    
    def startTranscription(self, file_paths, language, model_size):
        """
        Start transcription for multiple files.
        
        Args:
            file_paths: List of file paths
            language: "sv", "en", or "auto"
            model_size: "tiny", "small", "medium", or "large"
        
        Returns:
            Dict with success status and message
        """
        try:
            # Map language string to enum
            lang_map = {
                "sv": Language.SWEDISH,
                "en": Language.ENGLISH,
                "auto": Language.AUTO
            }
            lang = lang_map.get(language.lower(), Language.SWEDISH)
            
            # Map model size string to enum
            model_map = {
                "tiny": ModelSize.TINY,
                "small": ModelSize.SMALL,
                "medium": ModelSize.MEDIUM,
                "large": ModelSize.LARGE
            }
            model = model_map.get(model_size.lower(), ModelSize.MEDIUM)
            
            # Initialize jobs and add to queue
            with self._queue_lock:
                for file_path in file_paths:
                    if file_path not in self.active_jobs:
                        self.active_jobs[file_path] = {
                            "progress": 0.0,
                            "status": "pending",
                            "message": "Queued"
                        }
                    
                    # Create job and add to queue
                    job = TranscriptionJob(
                        file_path=file_path,
                        language=lang,
                        model_size=model
                    )
                    self.processing_queue.append((job, file_path))
            
            # Start processing queue if not already running
            if not self.is_processing:
                threading.Thread(target=self._process_queue, daemon=True).start()
            
            return {"success": True, "message": f"Started transcription for {len(file_paths)} file(s)"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def _process_queue(self):
        """Process transcription queue sequentially, one file at a time."""
        self.is_processing = True
        
        while True:
            with self._queue_lock:
                if not self.processing_queue:
                    self.is_processing = False
                    break
                job, file_path = self.processing_queue.pop(0)
            
            self._transcribe_file(job, file_path)
    
    def _transcribe_file(self, job, file_path):
        """Transcribe a single file."""
        try:
            self.active_jobs[file_path]["status"] = "processing"
            
            def progress_callback(progress, message):
                """Update progress for this file."""
                self.active_jobs[file_path]["progress"] = progress * 100
                self.active_jobs[file_path]["message"] = message
            
            # Run transcription
            engine = self._get_engine()
            result = engine.transcribe(job, progress_callback)
            
            if result.error:
                self.active_jobs[file_path]["status"] = "error"
                self.active_jobs[file_path]["message"] = result.error
            else:
                # Save result
                filename = f"{Path(file_path).stem}_{result.date}.json"
                engine.save_result(result, filename)
                
                self.active_jobs[file_path]["status"] = "completed"
                self.active_jobs[file_path]["progress"] = 100.0
                self.active_jobs[file_path]["message"] = "Complete"
        except Exception as e:
            self.active_jobs[file_path]["status"] = "error"
            self.active_jobs[file_path]["message"] = str(e)

def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

def main():
    html_file_path = resource_path('index.html')
    api = Api()
    
    global window
    window = webview.create_window(
        'TrustScribe',
        url=f'file://{html_file_path}',
        min_size=(600, 400),
        js_api=api,
        easy_drag=True
    )
    
    webview.start(debug=False)

if __name__ == '__main__':
    main()