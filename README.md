# DownPulse 🟢 — Full-Stack Uptime Monitor & Status Page

DownPulse is a real-time full-stack uptime monitoring dashboard built on the MERN Stack. It tracks system endpoints, logs ping metrics in the background, and pushes live latencies and statuses to a premium dark-mode interface via Socket.io WebSockets.

---

## 🚀 Key Features

*   **Background Ping Engine:** A Node.js scheduling manager that queries endpoints dynamically at preset intervals.
*   **WebSockets Integration:** Emits health check reports down to connected dashboard clients in real-time.
*   **SSRF Protection:** Built-in Server-Side Request Forgery filtering. All URL queries resolve hostnames via DNS and block private, loopback, or local IP networks (e.g. `127.x.x.x`, `192.168.x.x`, `10.x.x.x`, `::1`) at both the API boundary and worker check loops.
*   **Restrictive CORS Controls:** Fully restricted CORS policies for both Express REST routes and Socket.io WebSocket connections, allowing only the configured `FRONTEND_URL` origin instead of a wildcard `*`.
*   **In-Memory Database Fallback:** Automatically operates using safe local in-memory storage if MongoDB is not running, ensuring zero boot crashes.
*   **30-Day TTL Indexing:** Automatically drops heartbeat logs older than 30 days to optimize database storage.
*   **Premium Dark UI:** Sleek slate dashboard built in React + Tailwind CSS with micro-animations, metrics, and a 24-hour block-grid timeline.
*   **Notification Controls:** Configuration settings for custom incident channels (Email and Slack).

---

## 📂 Project Architecture

```text
downpulse/
├── backend/
│   ├── config/
│   │   └── db.js            # MongoDB Mongoose connection and fallback logic
│   ├── models/
│   │   ├── Monitor.js       # Uptime target model
│   │   └── Heartbeat.js     # Health logs schema with TTL index
│   ├── routes/
│   │   └── monitors.js      # REST API CRUD routes and historical endpoints
│   ├── services/
│   │   ├── pingEngine.js    # Health check runner (axios-based)
│   │   ├── scheduler.js     # Dynamic interval timer manager
│   │   └── socket.js        # Socket.io connection and room controllers
│   ├── utils/
│   │   └── security.js      # SSRF IP lookup & hostname DNS filter
│   ├── .env                 # Backend config env
│   ├── server.js            # Express application entrypoint
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.jsx          # Left nav sidebar & live status dot
    │   │   ├── MetricsGrid.jsx      # Uptime, Outage, and Latency KPI Cards
    │   │   ├── MonitorRow.jsx       # Target details, pings, and block timeline
    │   │   └── AddMonitorModal.jsx  # Configuration dialogue overlay
    │   ├── App.jsx          # React state, Socket client, and CRUD controllers
    │   ├── main.jsx
    │   └── index.css        # Global CSS, scrollbar overrides, glassmorphism
    ├── tailwind.config.cjs  # Tailwind custom configurations
    ├── postcss.config.cjs
    └── package.json
```

---

## 🛠️ Getting Started

### 1. Prerequisites
*   Node.js (v18+)
*   MongoDB (optional - falls back to in-memory mode automatically on connection timeout)

### 2. Run the Backend
1.  Navigate to the `/backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environmental variables in a `.env` file:
    ```env
    PORT=5000
    MONGODB_URI=mongodb://127.0.0.1:27017/downpulse
    ```
4.  Launch the backend server:
    ```bash
    node server.js
    ```
    *   *Backend API: `http://localhost:5000`*
    *   *Health Endpoint: `http://localhost:5000/health`*

### 3. Run the Frontend
1.  Navigate to the `/frontend` directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch the development server:
    ```bash
    npm run dev
    ```
    *   *Frontend Panel: `http://localhost:5173/`*

---

## 📡 REST API Reference

| Endpoint | Method | Description | Payload |
|---|---|---|---|
| `/health` | `GET` | Server diagnostics & DB connection status | N/A |
| `/api/monitors` | `GET` | Retrieves all monitors configurations | N/A |
| `/api/monitors/:id` | `GET` | Retrieves details for specific monitor | N/A |
| `/api/monitors/:id/history` | `GET` | Retrieves last 24h of heartbeats | N/A |
| `/api/monitors` | `POST` | Creates and activates new monitor target | `{ name, url, interval }` |
| `/api/monitors/:id` | `PUT` | Updates details or pauses checkers | `{ name, url, interval, isActive }` |
| `/api/monitors/:id` | `DELETE` | Removes monitor and purges heartbeats | N/A |
