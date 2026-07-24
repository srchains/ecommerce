import subprocess
import sys
import os
import time

def run():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")
    
    # --- AUTO-INSTALL DEPENDENCIES ---
    print("============================================================")
    print("📦 Checking and installing dependencies...")
    print("============================================================")
    
    # 1. Install Backend Dependencies
    requirements_file = os.path.join(backend_dir, "requirements.txt")
    if os.path.exists(requirements_file):
        print("🐍 Installing/verifying backend Python dependencies...")
        try:
            subprocess.run(["uv", "pip", "install", "-r", requirements_file], check=True)
            print("✅ Backend dependencies checked/updated successfully.")
        except Exception as e:
            print(f"⚠️ uv pip install failed or uv not in PATH ({e}), falling back to pip...")
            try:
                subprocess.run([sys.executable, "-m", "pip", "install", "-r", requirements_file], check=True)
                print("✅ Backend dependencies checked/updated successfully via pip.")
            except Exception as e2:
                print(f"❌ Failed to install backend dependencies: {e2}")
                sys.exit(1)
    
    # 2. Install Frontend Dependencies
    node_modules_dir = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules_dir):
        print("⚛️ frontend/node_modules not found. Installing frontend dependencies (npm install)...")
        try:
            subprocess.run("npm install", cwd=frontend_dir, shell=True, check=True)
            print("✅ Frontend dependencies installed successfully.")
        except Exception as e:
            print(f"❌ Failed to install frontend dependencies: {e}")
            sys.exit(1)
    else:
        print("✅ frontend/node_modules found. Skipping npm install.")
    print("============================================================\n")

    
    # 1. Determine Backend Python & Command
    # Use the virtualenv python directly to bypass manual activation.ps1
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        # Fallback to current global python if venv python doesn't exist
        venv_python = sys.executable

    backend_cmd = [venv_python, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"]
    
    # 2. Determine Frontend Command (npm is a batch file on Windows, needs shell=True)
    frontend_cmd = "npm run dev"
    
    print("============================================================")
    print("🚀 Starting SR Chains B2B Wholesale Platform...")
    print(f"👉 Backend Path: {backend_dir}")
    print(f"👉 Frontend Path: {frontend_dir}")
    print(f"👉 Python Executable: {venv_python}")
    print("============================================================")
    
    backend_process = None
    frontend_process = None
    
    try:
        # Start Backend Process
        print("⚡ Launching Backend (FastAPI + Uvicorn) on port 8000...")
        backend_process = subprocess.Popen(
            backend_cmd,
            cwd=backend_dir,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        
        # Give the backend a brief moment to spin up and bind port 8000
        time.sleep(2)
        
        # Start Frontend Process
        print("⚛️ Launching Frontend (React + Vite) on port 5173...")
        frontend_process = subprocess.Popen(
            frontend_cmd,
            cwd=frontend_dir,
            shell=True,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        
        print("\n🔥 Both servers are now running concurrently!")
        print("👉 Frontend: http://localhost:5173")
        print("👉 Backend API: http://localhost:8000")
        print("👉 Press Ctrl+C in this terminal to shut down both servers.")
        print("============================================================\n")
        
        # Monitor processes indefinitely
        while True:
            if backend_process.poll() is not None:
                print("\n❌ Backend server stopped unexpectedly.")
                break
            if frontend_process.poll() is not None:
                print("\n❌ Frontend server stopped unexpectedly.")
                break
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Shutting down servers gracefully...")
    finally:
        # Graceful cleanup of processes
        if backend_process and backend_process.poll() is None:
            print("Stopping backend server...")
            backend_process.terminate()
            backend_process.wait()
            
        if frontend_process and frontend_process.poll() is None:
            print("Stopping frontend server...")
            # On Windows, terminating a shell=True Popen process directly leaves 
            # node/vite zombie child processes. We use taskkill to clean up the process tree.
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
            
        print("✅ All servers shut down successfully. Have a nice day!")

if __name__ == '__main__':
    run()
