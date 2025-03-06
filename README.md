# 🚀 Robotics Contributors  
*An Electron application for video processing and management, designed for robotics contributors.*

---

## 📜 Description  
**Robotics Contributors** is a desktop application that allows users to process and manage video files. The application provides functionality for:  
- ✅ Video checksum generation  
- 🖼️ Thumbnail creation  
- 🔊 Audio extraction  
- 🎞️ Sample video generation  

---

## 📌 Prerequisites  
Before you begin, ensure you have the following installed:  

### 📦 Required Software  
- **Node.js** (v16 or higher recommended)  
- **npm** (v8 or higher)  
- **Python** (v3.8 or higher)  

### 🐍 Python Dependencies  
Ensure you install the necessary Python dependencies before running the application.  

---

## 🛠️ Installation  
Clone the repository and install dependencies:  
```sh
git clone https://github.com/your-repo/robotics-contributors.git
cd robotics-contributors
npm install
```

---

## ▶️ Running Locally  
To run the application in development mode:  
```sh
npm start
```
This will launch the application with **hot reloading** enabled.  

---

## 📦 Creating an Executable  
To create a distributable package with all dependencies:  
```sh
npm run make
```
The packaged application will be available in the `out` directory:  
- 🖥 **macOS**: `out/robotics-contributors-darwin-x64`  
- 💻 **Windows**: `out/robotics-contributors-win32-x64`  
- 🐧 **Linux**: `out/robotics-contributors-linux-x64`  

---

## 🔧 Scripts  
| Command               | Description |
|-----------------------|-------------|
| `npm start`          | Start the application in development mode |
| `npm run package`    | Package the application without creating installers |
| `npm run make`       | Create platform-specific distributables |
| `npm run publish`    | Publish the application |
| `npm run lint`       | Run ESLint to check code quality |

---

## 📜 License  
This project is licensed under the **MIT License** – see the [LICENSE](./LICENSE) file for details.  

---

## 👨‍💻 Author  
**Matias Del Carlo**  
