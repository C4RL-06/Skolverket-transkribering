import webview
import os
import sys

class Api:
    def getTranscriptionFiles(self):
        import glob
        json_files = glob.glob('transcription files/*.json')
        return [os.path.basename(file) for file in json_files]

def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

def main():
    html_file_path = resource_path('index.html')
    api = Api()
    
    window = webview.create_window(
        'Skolverkets Transkriberingsapp',
        url=f'file://{html_file_path}',
        min_size=(600, 400),
        js_api=api
    )
    
    webview.start(debug=False)

if __name__ == '__main__':
    main()