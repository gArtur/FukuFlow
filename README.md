# WealthFlow - Personal Wealth Management

A modern, elegant personal wealth management dashboard for tracking investments across multiple asset categories and family members.

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-7-purple) ![Node.js](https://img.shields.io/badge/Node.js-18+-green)

## Features

- 📊 **Premium Dashboard** - Visualize total worth and performance with high-performance interactive charts.
- 📈 **Interactive Sparklines** - Real-time gradient-filled performance graphs on every investment card for instant trend analysis.
- 👨‍👩‍👧‍👦 **Multi-Person Management** - Dynamic person management with automatic filtering and per-owner tracking.
- 🍰 **Dual-Mode Allocation** - Flip between Category grouping and Individual Investment views in a stunning doughnut visualization.
- 🕒 **Advanced Snapshot System** - Detailed history for every asset with date-specific values, investment tracking, and performance notes.
- 📁 **Smart CSV Import** - Bulk import snapshot history with support for multiple date formats and drag-and-drop interface.
- 🔒 **Privacy Mode** - Securely hide sensitive financial data while preserving trend visibility via percentage-based visualization.
- 🎨 **Modern Dark UI** - State-of-the-art glassmorphism design with a curated color palette and micro-animations.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Charts | Chart.js, react-chartjs-2 |
| Backend | Node.js, Express |
| Database | SQLite3 |

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Wealth-Management

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Running the Application

**1. Start the Backend Server:**

```bash
node server/index.js
```

The server runs on `http://localhost:3001`

**2. Start the Frontend (in a new terminal):**

```bash
npm run dev
```

The app opens at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The build output is in the `dist/` folder.

## Project Structure

```
Wealth-Management/
├── server/
│   ├── index.js        # Express server with SQLite
│   ├── seed.js         # Sample data seeder
│   └── wealth.db       # SQLite database (auto-created)
├── src/
│   ├── components/     # React components
│   ├── contexts/       # React contexts (Privacy)
│   ├── hooks/          # Custom hooks (usePortfolio)
│   ├── lib/            # API client
│   ├── types/          # TypeScript definitions
│   └── App.tsx         # Main application
├── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/persons` | List all persons |
| POST | `/api/persons` | Add a new person |
| DELETE | `/api/persons/:id` | Delete a person |
| GET | `/api/assets` | List all assets with history |
| POST | `/api/assets` | Add a new asset |
| PUT | `/api/assets/:id` | Update an asset |
| DELETE | `/api/assets/:id` | Delete an asset |
| POST | `/api/assets/:id/snapshot` | Add a value snapshot |
| PUT | `/api/snapshots/:id` | Update a snapshot |
| DELETE | `/api/snapshots/:id` | Delete a snapshot |

## Screenshots

The application features a dark, premium design with:
- Total Worth chart with time range filters
- Asset allocation doughnut chart
- Investment cards with quick snapshot actions
- Detailed investment history view

## License

MIT
