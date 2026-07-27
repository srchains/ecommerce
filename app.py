import subprocess
import sys
import os
import time

def check_and_install_dependencies(root_dir, backend_dir, frontend_dir, python_exec):
    print("============================================================")
    print("[*] Checking project dependencies...")
    
    # 1. Install/verify Python requirements from requirements.txt
    req_file = os.path.join(root_dir, "requirements.txt")
    if not os.path.exists(req_file):
        req_file = os.path.join(backend_dir, "requirements.txt")
        
    if os.path.exists(req_file):
        print(f"[*] Installing Python dependencies from {os.path.basename(req_file)}...")
        try:
            # Try uv first if available, fallback to pip
            subprocess.run(["uv", "pip", "install", "-r", req_file], check=True)
            print("[+] Python dependencies verified successfully via uv.")
        except Exception:
            try:
                subprocess.run([python_exec, "-m", "pip", "install", "-r", req_file], check=True)
                print("[+] Python dependencies verified successfully via pip.")
            except Exception as e:
                print(f"[!] Warning during dependency install: {e}")
            
    # 2. Check/install Node.js dependencies
    node_modules = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules):
        print("[*] Installing Frontend npm packages (node_modules missing)...")
        try:
            subprocess.run("npm install", cwd=frontend_dir, shell=True, check=True)
            print("[+] Frontend npm packages installed successfully.")
        except Exception as e:
            print(f"[!] Warning during npm install: {e}")
    else:
        print("[+] Frontend node_modules verified.")

def run():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")
    
    # 1. Determine Backend Python Executable
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        venv_python = sys.executable

    # Check and install requirements first
    check_and_install_dependencies(root_dir, backend_dir, frontend_dir, venv_python)

    backend_cmd = [venv_python, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"]
    frontend_cmd = "npm run dev"
    
    print("\n============================================================")
    print("SR Chains B2B Wholesale Platform - Launching Servers...")
    print(f"   Backend Path: {backend_dir}")
    print(f"   Frontend Path: {frontend_dir}")
    print(f"   Python Executable: {venv_python}")
    print("============================================================")
    
    backend_process = None
    frontend_process = None
    
    try:
        # Start Backend Process
        print("[+] Launching Backend (FastAPI + Uvicorn) on port 8000...")
        backend_process = subprocess.Popen(
            backend_cmd,
            cwd=backend_dir,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        
        time.sleep(2)
        
        # Start Frontend Process
        print("[+] Launching Frontend (React + Vite) on port 5173...")
        frontend_process = subprocess.Popen(
            frontend_cmd,
            cwd=frontend_dir,
            shell=True,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        
        print("\n[+] Both servers are now running concurrently!")
        print("   Frontend:   http://localhost:5173")
        print("   Backend API: http://localhost:8000")
        print("   Press Ctrl+C in this terminal to shut down both servers.")
        print("============================================================\n")
        
        while True:
            if backend_process.poll() is not None:
                print("\n[!] Backend server stopped unexpectedly.")
                break
            if frontend_process.poll() is not None:
                print("\n[!] Frontend server stopped unexpectedly.")
                break
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n[*] Shutting down servers gracefully...")
    finally:
        if backend_process and backend_process.poll() is None:
            print("Stopping backend server...")
            backend_process.terminate()
            backend_process.wait()
            
        if frontend_process and frontend_process.poll() is None:
            print("Stopping frontend server...")
            try:
                subprocess.run(
                    f"taskkill /F /T /PID {frontend_process.pid}", 
                    shell=True, 
                    stdout=subprocess.DEVNULL, 
                    stderr=subprocess.DEVNULL
                )
            except Exception:
                frontend_process.terminate()
            frontend_process.wait()
            
        print("[+] All servers shut down successfully. Have a nice day!")

if __name__ == '__main__':
    run()
