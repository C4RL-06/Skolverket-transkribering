import webview
import os
import sys

class Api:
    def getTranscriptionFiles(self):
        import glob
        json_files = glob.glob('transcription files/*.json')
        return [os.path.basename(file) for file in json_files]
    
    def saveTranscription(self, filename, transcriptionData):
        import json
        try:
            filepath = os.path.join('transcription files', filename)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(transcriptionData, f, indent=2, ensure_ascii=False)
            return {"success": True, "message": "Transcription saved successfully"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def openFileDialog(self):
        """ Open a file dialog and return the selected file path """
        file_types = ('Audio Files (*.mp3;*.wav;*.m4a)', 'All files (*.*)')
        result = window.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=False, file_types=file_types)
        return result

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
        'Skolverkets Transkriberingsapp',
        url=f'file://{html_file_path}',
        min_size=(600, 400),
        js_api=api,
        easy_drag=True # Enable drag and drop
    )
    
    webview.start(debug=False)

if __name__ == '__main__':
    main()