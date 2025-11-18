import webview
from webview import FileDialog
import os
import sys
import threading
import json
import glob
from pathlib import Path
from transcriber import TranscriptionEngine, TranscriptionJob, Language, ModelSize
import configparser
import warnings
warnings.filterwarnings("ignore", message=".*set_audio_backend.*")

# Store engines outside the Api class to avoid serialization issues
_engine_cache = {}

# Settings file path (in the application directory)
def get_settings_file_path():
    """Get the path to the settings .ini file."""
    if getattr(sys, 'frozen', False):
        # If running as a compiled executable
        application_path = os.path.dirname(sys.executable)
    else:
        # If running as a script
        application_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(application_path, 'settings.ini')

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
        """Get all transcription JSON files from Documents/TrustScribe subfolders."""
        base_dir = Path.home() / "Documents" / "TrustScribe"
        json_files = []
        
        if base_dir.exists():
            # Scan for transcription.json files in subfolders
            for json_file in base_dir.rglob("transcription.json"):
                # Get relative path from base_dir (e.g., "FolderName/transcription.json")
                relative_path = json_file.relative_to(base_dir)
                json_files.append(str(relative_path))
        
        return json_files
    
    def saveTranscription(self, relative_path, transcriptionData):
        """
        Save transcription data to a file.
        
        Args:
            relative_path: Relative path from TrustScribe base (e.g., "FolderName/transcription.json")
            transcriptionData: The transcription data to save
        """
        try:
            base_dir = Path.home() / "Documents" / "TrustScribe"
            filepath = base_dir / relative_path
            
            # Ensure parent directory exists
            filepath.parent.mkdir(parents=True, exist_ok=True)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(transcriptionData, f, indent=2, ensure_ascii=False)
            return {"success": True, "message": "Transcription saved successfully"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def getTranscriptionFileContent(self, relative_path):
        """
        Get the content of a transcription file.
        Used by the frontend to load transcription data.
        
        Args:
            relative_path: Relative path from TrustScribe base (e.g., "FolderName/transcription.json")
        
        Returns:
            Dict with success status and file content or error message
        """
        try:
            base_dir = Path.home() / "Documents" / "TrustScribe"
            filepath = base_dir / relative_path
            
            if not filepath.exists():
                return {"success": False, "message": f"File not found: {relative_path}"}
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = json.load(f)
            
            return {"success": True, "content": content}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def getAudioFilePath(self, transcription_relative_path, audio_relative_path):
        """
        Get the full path to an audio file for serving.
        
        Args:
            transcription_relative_path: Relative path to transcription folder (e.g., "FolderName/transcription.json")
            audio_relative_path: Relative path to audio from transcription folder (e.g., "audio.wav")
        
        Returns:
            Full absolute path to the audio file
        """
        base_dir = Path.home() / "Documents" / "TrustScribe"
        transcription_folder = base_dir / Path(transcription_relative_path).parent
        audio_path = transcription_folder / audio_relative_path
        return str(audio_path)

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
            language: "sv" or "en"
            model_size: "tiny", "small", "medium", or "large"
        
        Returns:
            Dict with success status and message
        """
        try:
            # Map language string to enum
            lang_map = {
                "sv": Language.SWEDISH,
                "en": Language.ENGLISH
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
                # Save result (creates folder and saves both JSON and WAV)
                engine.save_result(result)
                
                self.active_jobs[file_path]["status"] = "completed"
                self.active_jobs[file_path]["progress"] = 100.0
                self.active_jobs[file_path]["message"] = "Complete"
        except Exception as e:
            self.active_jobs[file_path]["status"] = "error"
            self.active_jobs[file_path]["message"] = str(e)
    
    def getSettings(self):
        """
        Get application settings from the .ini file.
        
        Returns:
            Dict with 'language' and 'theme' keys, or defaults if file doesn't exist
        """
        settings_file = get_settings_file_path()
        config = configparser.ConfigParser()
        
        # Default settings
        defaults = {
            'language': 'sv',
            'theme': 'light'
        }
        
        # Try to read existing settings
        if os.path.exists(settings_file):
            try:
                config.read(settings_file, encoding='utf-8')
                if 'Settings' in config:
                    settings = {}
                    settings['language'] = config.get('Settings', 'language', fallback=defaults['language'])
                    settings['theme'] = config.get('Settings', 'theme', fallback=defaults['theme'])
                    return settings
            except Exception as e:
                print(f"Error reading settings file: {e}")
                return defaults
        
        # Return defaults if file doesn't exist or error occurred
        return defaults
    
    def saveSettings(self, settings):
        """
        Save application settings to the .ini file.
        
        Args:
            settings: Dict with 'language' and 'theme' keys
        
        Returns:
            Dict with success status and message
        """
        try:
            settings_file = get_settings_file_path()
            config = configparser.ConfigParser()
            
            # Read existing config if it exists
            if os.path.exists(settings_file):
                config.read(settings_file, encoding='utf-8')
            
            # Ensure 'Settings' section exists
            if 'Settings' not in config:
                config.add_section('Settings')
            
            # Update settings
            config.set('Settings', 'language', str(settings.get('language', 'sv')))
            config.set('Settings', 'theme', str(settings.get('theme', 'light')))
            
            # Write to file
            with open(settings_file, 'w', encoding='utf-8') as f:
                config.write(f)
            
            return {"success": True, "message": "Settings saved successfully"}
        except Exception as e:
            return {"success": False, "message": str(e)}

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
        min_size=(800, 600),
        js_api=api,
        easy_drag=True
    )
    
    webview.start(debug=False)

if __name__ == '__main__':
    main()