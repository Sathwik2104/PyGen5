# TryWise — Project Walkthrough & Command History

A complete, end-to-end engineering walkthrough of the **TryWise** platform from the initial static frontend design to a full-stack, authenticated, MySQL-backed web application.

---

## Table of Contents
1. [Project Overview & Architecture](#1-project-overview--architecture)
2. [Phase 1: Initial Setup & Frontend Harmonization](#2-phase-1-initial-setup--frontend-harmonization)
3. [Phase 2: Migrating from SQLite to MySQL](#3-phase-2-migrating-from-sqlite-to-mysql)
4. [Phase 3: Securing Credentials with Environment Variables (.env)](#4-phase-3-securing-credentials-with-environment-variables-env)
5. [Phase 4: Role-Based Access, TryWise Edit & Auth Gating](#5-phase-4-role-based-access-trywise-edit--auth-gating)
6. [Complete Command Cheat-Sheet](#6-complete-command-cheat-sheet)
7. [Teammate Setup Guide (Cloning & Running Fresh)](#7-teammate-setup-guide-cloning--running-fresh)

---

## 1. Project Overview & Architecture

**TryWise** bridges digital fashion discovery with physical retail fitting rooms. Customers browse store inventories, "Bag It" into an in-store trial bag, and visit the store where staff have selected garments ready in fitting stalls.

### Technology Stack
- **Frontend**: React (Vite), Vanilla CSS design system (warm editorial luxury aesthetic: `#17151a` ink, `#2c2738` royal plum, `#e7d8ce` warm sand, `#faf8f5` canvas).
- **Backend**: Python 3.12, Django 5.x, Django REST Framework, JWT Authentication (`rest_framework_simplejwt`).
- **Database**: MySQL Server 8.4 (migrated from SQLite) via PyMySQL driver.
- **Environment Management**: `python-dotenv` for configuration separation.

---

## 2. Phase 1: Initial Setup & Frontend Harmonization

When the project started with basic frontend mockups and an SQLite backend, the styling was inconsistent across pages. The Products catalog, Bag It cart, and Store Owner request views had mismatched colors, harsh borders, and standard browser defaults.

### Key Changes
1. **Unified Design System (`style.css`)**:
   - Replaced generic styles with a curated palette, luxury typography, glassmorphism headers, and smooth micro-interactions.
   - Built an interactive **Image Zoom Modal** (`ImageModal.jsx`) allowing users and store owners to inspect fabric and texture before trial.
2. **Harmonized Pages**:
   - `Products.jsx`: Editorial grid, category selector tabs, out-of-stock badges, size pickers, and quick "Bag It" actions.
   - `Cart.jsx`: Elevated trial bag drawer with size breakdown, trial fee estimator, and sticky confirmation CTA.
   - `StoreRequests.jsx`: Dedicated Store Owner dashboard for real-time customer fitting requests with status workflow (`Pending` → `Preparing` → `Ready` → `Completed`).

### Commands Used:
```powershell
# Navigate to the frontend directory
cd d:\code\PyGen5\TryWise_React_Frontend

# Install frontend dependencies
npm install

# Start Vite local development server
npm run dev

# Validate production build
npm run build
```

---

## 3. Phase 2: Migrating from SQLite to MySQL

### Why Move from SQLite to MySQL?
- **SQLite** stores data in a single local file (`db.sqlite3`). While convenient for early prototyping, SQLite cannot handle concurrent write operations (locks the whole database), is not suitable for cloud deployment (ephemeral filesystems reset on redeploy), and cannot be connected to by multiple microservices or distributed servers.
- **MySQL** provides robust concurrent connections, transactional ACID compliance, indexing, and is the industry standard for production retail databases.

### Step 3.1: Install PyMySQL Driver
Django expects a MySQL driver. We installed `pymysql` inside our virtual environment:
```powershell
& "d:\code\PyGen5\backend\venv\Scripts\pip.exe" install pymysql
```

### Step 3.2: Configure Django PyMySQL Adapter
Added the following to `serv/__init__.py` so Django treats PyMySQL as `MySQLdb`:
```python
import pymysql
pymysql.install_as_MySQLdb()
```

### Step 3.3: Backup Existing Data from SQLite
Before switching databases, we exported all existing users, products, categories, and orders from SQLite into a portable JSON fixture:
```powershell
& "d:\code\PyGen5\backend\venv\Scripts\python.exe" "d:\code\PyGen5\backend\serv\manage.py" dumpdata --exclude auth.permission --exclude contenttypes --indent 2 > "d:\code\PyGen5\backend\serv\sqlite_data_backup.json"
```

### Step 3.4: Create MySQL Database
Using the local MySQL 8.4 installation, created the database `trywise_db`:
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p1234 -e "CREATE DATABASE IF NOT EXISTS trywise_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Step 3.5: Run Django Migrations on MySQL
Generated all relational tables (auth, products, orders, cart items) directly inside MySQL:
```powershell
& "d:\code\PyGen5\backend\venv\Scripts\python.exe" "d:\code\PyGen5\backend\serv\manage.py" migrate
```

### Step 3.6: Load SQLite Data into MySQL
Populated the fresh MySQL tables with our backed-up data:
```powershell
& "d:\code\PyGen5\backend\venv\Scripts\python.exe" "d:\code\PyGen5\backend\serv\manage.py" loaddata "d:\code\PyGen5\backend\serv\sqlite_data_backup.json"
```

---

## 4. Phase 3: Securing Credentials with Environment Variables (.env)

### Why Use `.env`?
Hardcoding sensitive credentials like `PASSWORD = '1234'` inside `settings.py` is a major security risk. If pushed to GitHub, anyone can view private passwords.

### Step 4.1: Install `python-dotenv`
```powershell
& "d:\code\PyGen5\backend\venv\Scripts\pip.exe" install python-dotenv
```

### Step 4.2: Create `.env` (Ignored by Git)
Created `backend/serv/.env` for local development:
```env
DB_NAME=trywise_db
DB_USER=root
DB_PASSWORD=1234
DB_HOST=127.0.0.1
DB_PORT=3306
SECRET_KEY=django-insecure-z#t_!c2@q2%h(m3q$k9+s...
DEBUG=True
```

### Step 4.3: Create `.env.example` (Committed to Git)
Created `backend/serv/.env.example` as a template for teammates:
```env
DB_NAME=trywise_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=127.0.0.1
DB_PORT=3306
SECRET_KEY=django-insecure-your-secret-key-here
DEBUG=True
```

### Step 4.4: Update `.gitignore`
Ensured `.env` and `.env.*` are ignored while `.env.example` remains tracked:
```gitignore
# Environment files
.env
.env.*
!.env.example
```

### Step 4.5: Update `settings.py`
Updated `backend/serv/serv/settings.py`:
```python
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'trywise_db'),
        'USER': os.environ.get('DB_USER', 'root'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', '3306'),
    }
}
```

### Step 4.6: Verify Configuration
```powershell
& "d:\code\PyGen5\backend\venv\Scripts\python.exe" "d:\code\PyGen5\backend\serv\manage.py" check
# Output: System check identified no issues (0 silenced).
```

---

## 5. Phase 4: Role-Based Access, TryWise Edit & Auth Gating

### 1. Products Protection for Unauthenticated Guests
- **Header & Hero CTAs**: Clicking "Products" or "Explore Collection ↗" when not logged in opens the Customer Login modal.
- **Direct Route Gating**: If a guest accesses `/products` or `/cart`, a clean locked screen (`🔒 Sign In to Explore Collection` / `🛍 Sign In to View Bag It`) is rendered with a sign-in action instead of showing products.
- **Store Requests Gating**: If a customer or guest visits `/store-requests`, a locked screen (`🔒 Store Owner Access Only`) prevents unauthorized access.

### 2. Category Tile Clicks ("Women" & "Men")
- In the homepage `EXPLORE` section, clicking either the **Women** or **Men** tile checks authentication:
  - If **Guest**: Prompts the customer login modal.
  - If **Logged-in**: Sets the active category to `"Women"` or `"Men"` and smoothly navigates to the filtered products page.
- Added cursor pointer and interactive hover lift in `style.css`.

### 3. Dynamic Hero Arch Roles
- **Guest View**:
  - Displays: *"Browse products to get suggestions"*.
  - Encourages the user to sign in to unlock personalized curation and save items.
- **Store Owner View**:
  - Completely hides the customer TryWise Edit.
  - Displays the **Store Owner Hub**:
    - Real-time indicator: `⚡ You have X active customer trial request(s)!`
    - "View Store Requests ↗" shortcut to the requests dashboard.
    - "+ Add New Product" quick button to open the product creation modal.
- **Customer with Browsing History View**:
  - Automatically captures products viewed by the user via `recentHistory.js` (`localStorage`).
  - Rotates up to 4 visited products (`TRYWISE EDIT · 01/04`).
  - Added smooth rotating animation (`@keyframes fashionRotateIn`).
  - Fixed typography clipping: center-aligned badges inside the arch dome (`top: 48px`).
  - Next Product preview: rendered a 3D layered wardrobe card stack (`.fashion-back-card`) displaying the upcoming piece peeking behind the current item.

### 4. Default "All" Category Behavior
- When a customer or store owner clicks "Products" in the header, or navigates from the Bag It cart or profile menu, the category automatically defaults to `"All"`.
- Authentication remains strictly enforced: unauthenticated visitors are redirected to the customer login modal and cannot view products without signing in.

### 5. Brand Identity: Logo & Browser Favicon
- **Header & Footer Brand Logo**: Integrated the TryWise horizontal hanger insignia (`/trywise-logo.png`) in place of plain text. Clicking the header logo seamlessly navigates back to the homepage.
- **Browser Tab Favicon**: Configured the circular "TW" hanger monogram icon (`/favicon.png`, `/favicon.ico`, `/logo192.png`) in `index.html` so TryWise appears distinctively in browser tabs, bookmarks, and mobile homescreens.

---

## 6. Complete Command Cheat-Sheet

Here is every single command used across the terminal during this project:

```powershell
# =========================================================
# 1. PYTHON VIRTUAL ENVIRONMENT & DEPENDENCY INSTALLATION
# =========================================================
# Navigate to backend
cd d:\code\PyGen5\backend\serv

# Activate venv (PowerShell)
& "..\venv\Scripts\Activate.ps1"

# Install MySQL driver and environment reader
pip install pymysql python-dotenv

# =========================================================
# 2. SQLITE DATA EXPORT (BACKUP)
# =========================================================
python manage.py dumpdata --exclude auth.permission --exclude contenttypes --indent 2 > sqlite_data_backup.json

# =========================================================
# 3. MYSQL DATABASE CREATION & SETUP
# =========================================================
# Create database using MySQL CLI
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS trywise_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# =========================================================
# 4. DJANGO MIGRATIONS & DATA IMPORT ON MYSQL
# =========================================================
# Run migrations on MySQL
python manage.py migrate

# Import backup JSON data into MySQL
python manage.py loaddata sqlite_data_backup.json

# Verify Django DB connection and health
python manage.py check

# Run Django Backend Development Server
python manage.py runserver 127.0.0.1:8000

# =========================================================
# 5. FRONTEND BUILD & DEV SERVER
# =========================================================
# Navigate to frontend
cd d:\code\PyGen5\TryWise_React_Frontend

# Install packages
npm install

# Run frontend dev server
npm run dev

# Compile production bundle to verify zero errors
npm run build
```

---

## 7. Teammate Setup Guide (Cloning & Running Fresh)

When a teammate clones the repository to their computer, here is the exact sequence they must run:

### 1. Configure the Backend
```powershell
# Go to backend directory
cd backend\serv

# Create Python virtual environment (if not present)
python -m venv ..\venv

# Activate virtual environment
..\venv\Scripts\activate

# Install required libraries
pip install django djangorestframework django-cors-headers djangorestframework-simplejwt pymysql python-dotenv pillow

# Copy the example environment file
copy .env.example .env

# Edit .env and enter their local MySQL password:
# DB_PASSWORD=their_local_mysql_password
```

### 2. Prepare Local MySQL
```powershell
# Open MySQL and create the database
mysql -u root -p -e "CREATE DATABASE trywise_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations to generate all tables
python manage.py migrate

# (Optional) Import seed data
python manage.py loaddata sqlite_data_backup.json

# Start the Django server
python manage.py runserver 127.0.0.1:8000
```

### 3. Start the Frontend
```powershell
# In a new terminal, go to frontend directory
cd TryWise_React_Frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Visit **http://localhost:5173/** in the browser.
