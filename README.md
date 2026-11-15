# TryWise 🛍️✨
> **Intelligent In-Store Fashion Trial & Reservation Platform**

[![Live Demo](https://img.shields.io/badge/Live_Demo-trywise.vercel.app-8b5cf6?style=for-the-badge&logo=vercel&logoColor=white)](https://trywise.vercel.app/)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge&logo=vercel)](https://trywise.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-Render-46e3b7?style=for-the-badge&logo=render&logoColor=white)](https://trywise.vercel.app/)

🌐 **Live Website:** [https://trywise.vercel.app/](https://trywise.vercel.app/)

TryWise bridges the gap between physical boutique retail and digital convenience. Shoppers can explore curated clothing collections, get real-time AI styling advice, reserve outfits for in-store fitting rooms via **"Bag It"**, and receive automated updates on their reservation windows. Store owners manage inventory, review incoming trial requests, configure reservation hold timers, and oversee fitting room turnover with robust security controls.

---

## 💡 What is TryWise? (In Plain English)

Imagine walking into a boutique on a crowded weekend. Instead of digging through messy clothing racks, searching for sizes, or waiting in line for a fitting room only to find out an item doesn't fit:

1. **Browse Before You Arrive:** Look through the store's real-time clothing catalog from your phone or laptop.
2. **Chat with the AI Stylist:** Ask questions like *"What shirt should I wear for a summer beach party?"* or *"What is the store's trial room policy?"*. The smart assistant suggests matching outfits from the live inventory.
3. **"Bag It" to Reserve:** Select your exact size and add shirts to your trial bag. 
4. **Walk In & Try On:** Hit **"Reserve Trial"**. The store staff sets aside your selected pieces in a fitting room so they are ready the moment you walk into the store.
5. **Timed Hold Guarantee:** The store holds your reserved outfits for a specific window (e.g., 2 hours) and sends you an email confirmation with your deadline.
6. **No Return Hassles:** Try them on in person. Buy only what you love, and leave the rest—no shipping costs, no waiting for delivery, and zero return packaging.

```text
  Customer Browses Online         AI Recommends Outfits         Customer Clicks "Bag It"
  [Online Catalog / Search]  ───>  [Smart Shopping AI]   ───>  [Picks Sizes & Reserves]
                                                                        │
                                                                        ▼
  Customer Tries & Buys           Fitting Room Set Aside       Store Receives Alert
  [In-Store Fitting Room]   <───  [Garments Pulled & Ready] <───  [Live Merchant Dashboard]
```

### Why Stores Love It:
- **Footfall Driver:** Turns online browsers into physical in-store walk-ins.
- **Zero Inventory Deadlock:** If a customer doesn't visit within their reservation window, the timer automatically expires and items are restocked back onto the sales floor.
- **Live Merchant Dashboard:** Store owners see incoming customer trial requests, customer phone numbers, item sizes, and reservation countdowns in real time.

---

## 🌟 Key Features

### 1. Smart Search & Persistent "Bag It" Trial Cart
- **Dynamic Search & Filtering:** Real-time search across product titles, descriptions, categories, and tags.
- **Cart State Preservation:** Seamlessly preserves selected items, quantities, and chosen sizes in the trial cart even while browsing and applying search filters.
- **Trial Reservations:** Converts trial bag items into an active boutique reservation with deadline tracking.

### 2. Smart Shopping & Store FAQ Assistant (Groq Cloud AI)
- **Customer-Only Access:** Exclusively available to logged-in customers; cleanly hidden for guests and store staff.
- **Hybrid AI Architecture:**
  - **Tier 1 (Instant Zero-Cost):** Resolves frequent store policies (reservation time limits, fitting room rules, payment methods, returns) locally in `<10ms`.
  - **Tier 2 (Groq Cloud AI):** Powered by Groq Cloud's ultra-fast `openai/gpt-oss-120b` engine (~200ms latency, 1,000 requests/day free tier) for conversational styling advice, occasion suggestions, and outfit recommendations.
  - **Tier 3 (Local Catalog Fallback):** Gracefully falls back to real-time database catalog extraction if network or AI rate limits are encountered.

### 3. Role-Based Security & Dual-Track Authentication
- **Customer Sign-In:**
  - Standard Email + Password registration with 6-digit email verification OTP.
  - **Google OAuth 2.0 (Google Identity Services):** Compact, sleek one-click sign-in with automatic account linking (existing passwords remain intact; new customer accounts are created automatically).
- **Store Owner Sign-In (Mandatory 2FA OTP):**
  - High-privilege administrative portal strictly isolated from consumer social logins.
  - Requires email + password + time-limited 6-digit OTP sent directly to the store's verified business inbox on every login attempt.

### 4. Boutique Operations & Fitting Room Management
- **Configurable Reservation Window:** Store owners can dynamically adjust trial hold duration (hours/minutes) based on boutique footfall.
- **Decision Tracking:** Mark trialed items as **Purchased** or **Restocked** upon fitting room completion.
- **Automated Email Notifications:** Sends welcome emails, reservation confirmations, ready-for-trial alerts, and deadline reminders.

---

## 🏗️ Technology Stack

| Component | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Context API, Vanilla CSS (Warm Paper Design System) |
| **Backend** | Python 3.12, Django 5, Django REST Framework, SimpleJWT |
| **AI / LLM** | Groq Cloud AI (`openai/gpt-oss-120b` via OpenAI-compatible endpoints) |
| **Authentication** | Google Identity Services (GIS SDK), PyJWT, Django Auth |
| **Database** | MySQL / TiDB Cloud Serverless (Production), SQLite (Local Fallback) |
| **Media / Assets** | Cloudinary & WhiteNoise static collection |
| **Containerization** | Docker (optimized multi-platform Python 3.12 slim image) |
| **Hosting** | Vercel (Frontend), Render Free Tier (Backend Web Service) |

---

## 📁 Repository Structure

```text
PyGen5/
├── backend/
│   ├── Dockerfile                  # Production container definition for Render
│   ├── .dockerignore               # Docker build exclusions
│   ├── requirements.txt            # Python dependencies
│   └── serv/
│       ├── manage.py               # Django management CLI
│       ├── .env                    # Local backend environment variables (git-ignored)
│       ├── .env.example            # Backend environment template
│       ├── serv/                   # Django settings, WSGI, ASGI, and root routing
│       └── trywise/                # Main app: models, views, serializers, emails, URLs
├── TryWise_React_Frontend/
│   ├── index.html                  # HTML entry point (loads Google GSI SDK)
│   ├── package.json                # Frontend dependencies & npm scripts
│   ├── vercel.json                 # Vercel SPA routing rewrites
│   ├── .env                        # Local frontend environment variables (git-ignored)
│   ├── .env.example                # Frontend environment template
│   └── src/
│       ├── app.jsx                 # Root component & page router
│       ├── style.css               # Unified TryWise design system
│       ├── components/             # Modals, Chatbot, Header, Footer
│       ├── context/                # AuthContext, ToastContext
│       ├── pages/                  # Home, Products, Cart, StoreRequests, Info
│       └── services/               # API clients (api.js, recentHistory.js)
├── .gitignore                      # Git exclusion rules
└── README.md                       # Project documentation
```

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js** (v18 or higher) & **npm**
- **Python** (v3.10 to v3.12)
- **Git**
- Optional: MySQL / TiDB Cloud instance (or use local SQLite)

---

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/TryWise.git
cd TryWise
```

---

### Step 2: Backend Setup (Django)

1. Navigate to the backend directory and create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   ```

2. Activate virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux:**
     ```bash
     source venv/bin/activate
     ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cd serv
   cp .env.example .env
   ```
   Edit `backend/serv/.env` with your credentials:
   ```env
   # Database (leave blank or comment out to default to db.sqlite3)
   DB_NAME=trywise_db
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_HOST=127.0.0.1
   DB_PORT=3306

   # Email Configuration (for OTPs and notifications)
   EMAIL_HOST_USER=your_email@gmail.com
   EMAIL_HOST_PASSWORD=your_google_app_password

   # Groq Cloud AI (https://console.groq.com)
   GROQ_API_KEY=gsk_your_groq_api_key
   GROQ_MODEL=openai/gpt-oss-120b

   # Google OAuth (https://console.cloud.google.com)
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

   # Reservation Hold Duration (default: 2 hours)
   TRIAL_RESERVATION_HOURS=2
   TRIAL_RESERVATION_MINUTES=0
   ```

5. Run migrations & start development server:
   ```bash
   python manage.py migrate
   python manage.py runserver 127.0.0.1:8000
   ```
   Backend will be available at `http://127.0.0.1:8000/`.

---

### Step 3: Frontend Setup (React + Vite)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd TryWise_React_Frontend
   npm install
   ```

2. Configure environment variables:
   Create or edit `TryWise_React_Frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000/api
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

3. Start Vite development server:
   ```bash
   npm run dev
   ```
   Frontend will be running at `http://localhost:5173`.

---

## 🔑 Environment Variables Reference

### Backend (`backend/serv/.env` and Render Environment)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | Full database connection string (e.g. MySQL / TiDB) | SQLite fallback |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Individual database connection parameters | - |
| `EMAIL_HOST_USER` | Gmail address for dispatching OTPs | - |
| `EMAIL_HOST_PASSWORD` | 16-character Google App Password | - |
| `GROQ_API_KEY` | API key from Groq Cloud Console | - |
| `GROQ_MODEL` | Groq AI model name | `openai/gpt-oss-120b` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Web Client ID from Google Cloud | - |
| `TRIAL_RESERVATION_HOURS` | Default trial reservation expiration (hours) | `2` |
| `TRIAL_RESERVATION_MINUTES` | Default trial reservation expiration (minutes) | `0` |

### Frontend (`TryWise_React_Frontend/.env` and Vercel Environment)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Backend REST API endpoint | `http://127.0.0.1:8000/api` (local) / `https://trywise.onrender.com/api` (prod) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Client ID | `*.apps.googleusercontent.com` |

---

## 🌐 Production Deployment

### Backend (Render Web Service)
1. Link your GitHub repository in the [Render Dashboard](https://dashboard.render.com).
2. Choose **Web Service** → **Docker Runtime**.
3. Set **Root Directory** to: `backend`.
4. Render will automatically detect `backend/Dockerfile`.
5. Under **Environment Variables**, add:
   - `DATABASE_URL` (e.g., TiDB Cloud MySQL connection URI)
   - `EMAIL_HOST_USER` & `EMAIL_HOST_PASSWORD`
   - `GROQ_API_KEY` & `GROQ_MODEL`
   - `GOOGLE_CLIENT_ID`
   - `PORT` = `10000`
6. Deploy the web service.

### Frontend (Vercel)
1. Import your GitHub repository in [Vercel](https://vercel.com).
2. Set **Root Directory** to: `TryWise_React_Frontend`.
3. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://<your-render-backend-url>/api`
   - `VITE_GOOGLE_CLIENT_ID` = `<your-google-client-id>`
4. Deploy. Vercel automatically applies rewrites via `vercel.json` for SPA client-side routing.

---

## 🔒 Security Architecture Highlights
- **No Shared Session Risk:** Separation of consumer OAuth from administrative 2FA OTP eliminates accidental privilege escalation.
- **Audience Verification:** Backend cryptographically validates `aud` against `GOOGLE_CLIENT_ID` to prevent cross-app token reuse.
- **Zero Heavy Native Deps:** Google OAuth validation uses standard Python `urllib` to operate reliably within Render's 512MB RAM free tier.
- **Cloudflare WAF Compliance:** Groq API requests pass browser-grade User-Agent headers to ensure reliable throughput.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
