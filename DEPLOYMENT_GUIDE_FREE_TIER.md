# 🚀 TryWise — 100% Free-Tier Deployment Guide
### Complete Step-by-Step Procedure: TiDB Cloud + Render + Vercel

This guide walks you through deploying the complete TryWise platform for **$0.00/month** using modern, free-tier cloud services:

| Layer | Provider | Free Plan Details | Role |
| :--- | :--- | :--- | :--- |
| **Database** | **TiDB Cloud** | 5 GiB Storage, 50M Requests/mo, No credit card needed | Cloud MySQL 8.4 database |
| **Backend API** | **Render** | 512 MB RAM, 0.1 vCPU, 750 free hours/mo | Containerized Django 6.1 + Gunicorn |
| **Frontend** | **Vercel** | Unlimited static bandwidth, global edge CDN | React + Vite Single Page Application |

---

## 📌 Architectural Flow

```
[User Browser]
      │
      ├── (1) Loads React UI from Vercel Edge CDN (trywise.vercel.app)
      │
      └── (2) Sends API calls to Render (trywise-api.onrender.com/api)
                     │
                     └── (3) Reads/Writes data to TiDB Cloud (gateway01...prod.aws.tidbcloud.com:4000)
```

---

## Step 1: Push Config Changes to GitHub

In your PowerShell terminal in `d:\code\PyGen5`, commit and push all newly configured deployment files:

```powershell
git add .
git commit -m "Configure production deployment for Vercel, Render Docker, and TiDB Cloud"
git push
```

---

## Step 2: Create Free Cloud MySQL Database (TiDB Cloud)
*(Takes ~3 minutes)*

1. Go to **[https://tidbcloud.com](https://tidbcloud.com)** and click **Try Free**.
2. Sign up using your **GitHub** or **Google** account (no credit card required).
3. Once logged in, click **Create Cluster**:
   - Choose **Serverless / Starter (Free)**.
   - Cluster Name: `trywise-db` (or default).
   - Region: Pick the region closest to you (e.g. `US East - N. Virginia` or `Singapore`).
   - Click **Create**.
4. In the Security Settings popup:
   - Set a strong root password (e.g. `TryWise2026!Secure`). **Copy and save this password!**
5. On the Cluster Overview page, click **Connect**:
   - Connection Type: Choose **General / MySQL CLI**.
   - Note down the connection parameters:
     - **Host**: e.g., `gateway01.us-east-1.prod.aws.tidbcloud.com`
     - **Port**: `4000`
     - **User**: e.g., `xxxx.root`
     - **Password**: *the password you set above*
     - **Database**: `test` (or `trywise_db`)

> 💡 **Tip**: In the TiDB Cloud web console, click on **SQL Editor** on the left and run:
> ```sql
> CREATE DATABASE IF NOT EXISTS trywise_db;
> ```

---

## Step 3: Deploy Django Backend on Render (Docker)
*(Takes ~4 minutes)*

1. Go to **[https://render.com](https://render.com)** and click **Get Started** → **Sign in with GitHub**.
2. In the Render Dashboard, click **New +** (top right) → **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your `PyGen5` repository.
4. Fill in the service configuration:
   - **Name**: `trywise-api` (your URL will be `https://trywise-api.onrender.com`)
   - **Region**: Match the region of your TiDB Cloud database (e.g. `US East (Ohio)` or `Singapore`).
   - **Branch**: `master` (or `main`)
   - **Root Directory**: `backend`  *(⚠️ Important: set this to backend)*
   - **Runtime**: Select **Docker**
   - **Dockerfile Path**: `Dockerfile`  *(or leave blank to auto-detect)*
   - **Instance Type**: Select **Free** (512 MB RAM, 0.1 CPU)
5. Scroll down to **Environment Variables**:
   
   > 💡 **Quickest Way**: Click the **"Add from .env"** button in Render and paste this whole block at once:
   ```env
   DEBUG=False
   SECRET_KEY=django-prod-trywise-secure-key-2026-xyz
   ALLOWED_HOSTS=*
   CORS_ALLOW_ALL_ORIGINS=True
   DB_NAME=trywise_db
   DB_HOST=your-tidb-host-here
   DB_PORT=4000
   DB_USER=your-tidb-user-here
   DB_PASSWORD=your-tidb-password-here
   DB_SSL=True
   ```

   *(Or if typing manually one by one, do NOT include backticks or `=` inside the Key field)*:

| Key (Plain text) | Value | Notes |
| :--- | :--- | :--- |
| DEBUG | False | Disables debug mode for security |
| SECRET_KEY | django-prod-trywise-secure-key-2026-xyz | Long secret string |
| ALLOWED_HOSTS | * | Allows requests to your Render URL |
| CORS_ALLOW_ALL_ORIGINS | True | Allows Vercel frontend to make API calls |
| DB_NAME | trywise_db | Your database name in TiDB |
| DB_HOST | *(your TiDB host)* | e.g. gateway01.us-east-1.prod.aws.tidbcloud.com |
| DB_PORT | 4000 | TiDB Cloud MySQL port |
| DB_USER | *(your TiDB user)* | e.g. xxxx.root |
| DB_PASSWORD | *(your TiDB password)* | The password you set in TiDB |
| DB_SSL | True | Enables SSL encryption required by TiDB |

6. Click **Create Web Service**.
7. Render will now:
   - Pull your repository.
   - Build the Docker container.
   - Run `python manage.py collectstatic`.
   - Run `python manage.py migrate` (creates all tables in TiDB Cloud).
   - Run `python manage.py seed_cloud_db` (automatically imports all products, categories, users, and orders).
   - Start Gunicorn.
8. Once you see **"Your service is live"**, copy your backend URL:
   `https://trywise-api.onrender.com`

---

## Step 4: Deploy React Frontend on Vercel
*(Takes ~2 minutes)*

1. Go to **[https://vercel.com](https://vercel.com)** and sign in with your **GitHub** account.
2. In the Vercel Dashboard, click **Add New...** → **Project**.
3. Select your `PyGen5` repository and click **Import**.
4. Configure the project settings:
   - **Project Name**: `trywise`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select **`TryWise_React_Frontend`**.
   - Build & Output Settings will auto-detect (`npm run build` and `dist`).
5. Open the **Environment Variables** dropdown and add:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://trywise-api.onrender.com/api` *(replace with your actual Render URL + `/api`)*
6. Click **Deploy**.
7. In ~30 seconds, Vercel will complete the build and assign your live domain:
   `https://trywise.vercel.app`

---

## Step 5: Verification & Testing

1. Open your Vercel link (`https://trywise.vercel.app`).
2. Verify that:
   - The homepage loads instantly with TryWise branding.
   - The Products page displays your products and images.
   - Clicking "Sign In" allows logging into existing customer or store owner accounts (`sathwik2104@gmail.com` / `charishma123@gmail.com`).
   - "Bag It" cart actions update and persist in the TiDB Cloud MySQL database.

---

## ⚡ Handling Free-Tier Sleep (Cold Starts)
Because Render's free tier spins down after 15 minutes of inactivity, the very first API request after being idle takes ~45 seconds to wake up. Once awake, all interactions are fast.

To keep it awake for free, you can optionally set up a free uptime monitor (like [cron-job.org](https://cron-job.org) or [uptimerobot.com](https://uptimerobot.com)) to ping `https://trywise-api.onrender.com/api/products/` every 10 minutes.
