import webview
import os
import sys

class Api:
    def say_hi(self):
        return "Hi from Python!"

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
        'Transcription App',
        url=f'file://{html_file_path}',
        min_size=(400, 300),
        js_api=api
    )
    
    webview.start(debug=False)

if __name__ == '__main__':
    main()