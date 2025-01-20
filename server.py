import http.server
import socketserver
import os
import webbrowser
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import time

PORT = 8000

class MyHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith(('.html', '.css', '.js')):
            print(f"File {event.src_path} has been modified")

def run_server():
    Handler = http.server.SimpleHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        webbrowser.open(f'http://localhost:{PORT}')
        
        # Set up file watching
        event_handler = MyHandler()
        observer = Observer()
        observer.schedule(event_handler, path='.', recursive=False)
        observer.start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            observer.stop()
            observer.join()
            print("\nServer stopped.")

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    run_server()
