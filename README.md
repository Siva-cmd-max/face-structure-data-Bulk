# FaceBatch: High-Velocity Biometric Scanner
A production-grade, zero-failure batch face extraction pipeline built specifically for autonomous mass ingestion and instantaneous identity mapping into an SQL Database.
## Project Overview
FaceBatch is a full-stack biometric automation tool built to securely ingest entire operating system folders of portrait and candidate photos. It operates by natively bypassing browser layout bottlenecks, rapidly converting human faces into deep mathematical representations (embeddings), and fire-and-forgetting them into a robust Microsoft SQL database with extreme precision.
## Core Technologies Stack
*   **Frontend:** React, Vite, Tailwind CSS (Single Page Application architecture)
*   **Backend:** C# ASP.NET Core 8 Web API, Entity Framework Core (Fully independent asynchronous server)
*   **AI & Machine Learning:** `face-api.js`, SSD MobileNet V1, FaceLandmark68Net (generates exact 128-D vector embeddings)
*   **Database:** Microsoft SQL Server (stores candidate embeddings, scan telemetry, and bounding boundaries)
## How The AI Engine Actually Works
Instead of relying on slow visual browser rendering, the engine intercepts raw pixel data and uses purely mathematical tensor processing to map a face across 128 dimensions.
*   **In-Memory Bypassing:** When a user selects a folder, the system completely ignores the HTML UI layout. It unzips the image directly into computer RAM (`await img.decode()`) and injects the raw pixels directly into a WebGL Canvas. 
*   **Detection (SSD MobileNet V1):** The AI pinpoint-scans the raw WebGL output. Using an extreme 0.10 confidence floor with mathematical sorting, it guarantees it locks strictly onto the optimal human face, completely ignoring background noise.
*   **Translation:** It feeds this crop into a secondary recognition network, extracting a 128-Dimensional Array (a unique "mathematical fingerprint" for that person).
*   **Fire-and-Forget Caching:** It compiles the geometry and array and asynchronously shoots the payload to the C# Backend, immediately proceeding to scan the next photo without halting to wait for database confirmation.
## The Operational Workflow Explained
The application is natively built around a single, highly optimized batch pipeline. Here is a breakdown of what the engine does:
### 1️⃣ Autonomous Bulk Ingestion (The Mass Target Import)
**Goal:** Securely induct hundreds of candidate faces into the database blisteringly fast.
**How It Works:** Administrators click a single button to upload a bulk folder of images.
*   **Warmup Sequence:** Before looking at the first photo, the system secretly compiles its WebGL C++ shaders on an invisible 10x10 dummy canvas, ensuring the very first candidate photo never times out or drops.
*   **Instant Extraction:** The scanner blasts through the folder array, stamping the detected face coordinates and calculating the 128D mathematical points natively via the GPU.
*   **Database Archiving:** Saves the geometry, facial arrays, and detailed millisecond telemetry metrics into the SQL Server database flawlessly.
## Process of How to Run the Project Locally
Because the layout features a fully detached Backend and Frontend, you must run them sequentially in two separate terminal windows.
### Step 1: Prepare the Microsoft Database
The software needs a location to store the extracted face calculations safely.
1. Open **Microsoft SQL Server Management Studio (SSMS)**.
2. Locate the `database_update.sql` file in the main project folder.
3. Open this file in the SQL environment and click **Execute**. This will automatically generate the database and the tables required to catch the incoming face scans.
### Step 2: Starting the C# Backend
The C# server acts as the secure middleman between the web scanner and the database.
1. Press `Win + R`, type `cmd`, and press Enter to open the Command Prompt.
2. Navigate to the project backend directory by typing:
   ```cmd
   cd "C:\path\to\your\project\FaceScannerApi"
   ```
3. Start the backend server by typing:
   ```cmd
   dotnet run
   ```
*(Leave this Command Prompt window open and running. The server is now silently listening for face data).*
### Step 3: Starting the User Interface (React)
This spins up the dark-mode graphical interface that executes the Neural Networks and triggers the mass uploads.
1. Open a **new, separate terminal** (`Win + R`, type `cmd`, Enter).
2. Navigate to the frontend folder:
   ```cmd
   cd "C:\path\to\your\project\frontend"
   ```
3. Install the necessary Node dependencies (only needed the first time):
   ```cmd
   npm install
   ```
4. Boot up the Vite developer server:
   ```cmd
   npm run dev
   ```
5. Open your browser: The terminal will supply a local URL (e.g., `http://localhost:5173`). Click it to access the visual dashboard and start batch verifying faces!
