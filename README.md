TRACK_ID=PS03

# StockSense AI — Sales & Inventory Copilot

> **NexusTiQ24 PS03 Final Solution**: An AI-powered sales and inventory decision-support platform engineered specifically for small and medium retail businesses. StockSense AI connects directly to real database records, deterministically identifies stockout risks and excess capital bottlenecks, runs interactive What-If scenario simulations, and pairs store managers with an audit-grounded Google Gemini AI Copilot.

---

## 1. Problem Statement

Small retail businesses frequently suffer from two opposing operational failures:
1. **Silent Stock-Outs**: Fast-moving or high-margin products deplete faster than anticipated, leading to missed revenue, dissatisfied shoppers, and supply chain panic.
2. **Capital Trapping in Overstock**: Slow-moving products quietly occupy working capital and valuable shelf space without automated liquidation triggers.

Generic dashboards present passive data without actionability, while ungrounded AI chatbots hallucinate sales numbers and produce unverified recommendations. Retail operators need an **auditable, deterministic, predictive decision engine**.

---

## 2. Solution Overview

**StockSense AI** bridges the gap between raw relational transactional records and executive decision-making. 

```
+-----------------------------------------------------------------------------------+
|                                 STOCKSENSE AI                                     |
|                                                                                   |
|  +------------------------+   +-----------------------+   +--------------------+  |
|  | Real-Time Dashboard    |   | Inventory Management  |   | Sales Analytics    |  |
|  | • Live KPI aggregates  |   | • Multi-filter table  |   | • Trend charts     |  |
|  | • Attention items      |   | • Status badges       |   | • Margin breakdown |  |
|  | • Realtime velocity    |   | • 1-Click Reordering  |   | • Anomaly radar    |  |
|  +------------------------+   +-----------------------+   +--------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | CORE INNOVATION: Interactive What-If Inventory Sandbox                      |  |
|  | • Dynamic Demand Shift (+/- %)     • Simulation Horizon (7-90 Days)         |  |
|  | • Supplier Lead Time Modifiers     • Dual-Trajectory Runway Curves          |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | GROUNDED GEMINI AI COPILOT & DATA PROVENANCE AUDIT                          |  |
|  | • Natural Language Queries         • 100% Deterministic Python Calculations |  |
|  | • Exact Math Formulas & Evidence   • Strict Zero-Hallucination Guardrails   |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Key Innovations

### 1. Interactive What-If Inventory Simulator
Allows store managers to adjust parameters in real time:
- **Expected Sales Shift ($\Delta\%$)**: Simulates surges (+10% to +200%) or drops (-10% to -80%).
- **Simulation Horizon**: Projects daily stock trajectories over 7 to 90 days.
- **Supplier Lead Time Delays**: Evaluates impact of delayed vendor deliveries.
- **Scheduled Restock Ingestion**: Visualizes exactly how and when incoming replenishment batches restore healthy runway.

### 2. Strict Deterministic AI Grounding
Gemini 1.5 never performs unverified math or creates synthetic forecasts:
1. User asks a natural language question.
2. The Python backend extracts relevant SQL records via SQLAlchemy.
3. The deterministic analytics engine computes exact numbers (ADS, runway days, shortage, revenue at risk).
4. Gemini receives the structured context and produces a clear, natural-language executive summary.
5. If data is missing or insufficient, Gemini explicitly returns: *"Insufficient data to answer this accurately."*

### 3. Click-to-Audit Data Evidence Panel
Every KPI, alert, priority rank, and chart metric includes an **Audit Evidence Drawer** revealing:
- Underlying database source tables
- Evaluated date range window
- Exact mathematical formulas used
- Snapshot of query parameters and timestamps

---

## 4. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS (Executive Neutral Palette — Warm Charcoal, Slate, Off-White, Emerald accents; No Blue theme).
- **3D Graphics**: Three.js interactive 3D inventory visualization matrix.
- **Visual Analytics**: Recharts responsive area, line, and bar charts.
- **Icons**: Lucide React.
- **Backend**: Python 3.14+, Flask REST API, Flask-CORS.
- **ORM & Database**: SQLAlchemy 2.0 with default SQLite engine and full PostgreSQL support.
- **AI Intelligence**: Google Gemini API (`google-genai` / `google-generativeai`).
- **Data Ingestion**: Pandas, OpenPyXL with multi-entity schema validation and downloadable CSV templates.

---

## 5. Database Schema

The database consists of 7 normalized relational tables:

```
                          +-------------------+
                          |     Suppliers     |
                          +-------------------+
                          | supplier_id (PK)  |
                          | supplier_name     |
                          | contact_details   |
                          | lead_time_days    |
                          +---------+---------+
                                    |
                                    | 1:N
                                    v
+-------------------+     +---------+---------+     +-------------------+
|      Stores       |     |     Products      |     |     Inventory     |
+-------------------+     +-------------------+     +-------------------+
| store_id (PK)     |     | product_id (PK)   |     | inventory_id (PK) |
| store_name        |     | product_name      |     | product_id (FK)   |
| location          |     | category          |     | current_stock     |
+---------+---------+     | supplier_id (FK)  |     | reserved_stock    |
          |               | selling_price     |     | last_restock_date |
          | 1:N           | cost_price        |     | warehouse_or_store|
          v               | reorder_level     |     | updated_at        |
+---------+---------+     | reorder_quantity  |     +-------------------+
|       Sales       |     | active_status     |
+-------------------+     +---------+---------+
| sale_id (PK)      |               |
| product_id (FK)   |<--------------+ 1:N
| quantity_sold     |
| selling_price     |     +-------------------+     +-------------------+
| total_amount      |     |       Users       |     | AI Query History  |
| sale_date         |     +-------------------+     +-------------------+
| store_id (FK)     |     | user_id (PK)      |     | query_id (PK)     |
+-------------------+     | name              |     | user_query        |
                          | email (Unique)    |     | generated_answer  |
                          | role              |     | supporting_data   |
                          | password_hash     |     | created_at        |
                          +-------------------+     +-------------------+
```

---

## 6. Quickstart & Setup Instructions

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ and npm

### 1. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

### 2. (Optional) Build Frontend Assets
The frontend assets are pre-built in `frontend/dist`. To rebuild from source:
```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. Run the Application
Start the single unified server:
```bash
python app.py
```
Open **`http://127.0.0.1:5000`** in your browser.

---

## 7. Environment Variables Configuration

Create a `.env` file in the root directory (or copy from `.env.example`):

```env
# Secret Key
SECRET_KEY=stocksense-ai-production-secret-key-2024

# Database Connection (Default: local SQLite database)
DATABASE_URL=sqlite:///stocksense.db

# For PostgreSQL:
# DATABASE_URL=postgresql://username:password@localhost:5432/stocksense_db

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Server Host & Port
PORT=5000
HOST=0.0.0.0
DEBUG=False
```

> **Note on AI Key**: If no `GEMINI_API_KEY` is provided, StockSense AI gracefully operates using its deterministic grounded engine, ensuring 100% functionality even in offline or evaluation environments.

---

## 8. Connecting to a Real PostgreSQL Database

To switch from SQLite to a live PostgreSQL database:
1. Install the PostgreSQL driver: `pip install psycopg2-binary`
2. Update your `.env` connection string:
   ```env
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/stocksense
   ```
3. Run `python app.py`. Tables will be automatically created upon startup.

---

## 9. Importing Real Data (CSV / Excel)

1. Navigate to **Data Management** (`/data-management`).
2. Download pre-formatted CSV templates for any entity:
   - Products
   - Inventory
   - Sales Transactions
   - Suppliers
   - Stores
3. Select your entity type and upload your `.csv` or `.xlsx` spreadsheet.
4. The system validates all columns and types row-by-row, reporting any errors with exact row numbers.

---

## 10. REST API Documentation

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Database connection health and service status |
| `/api/dashboard/summary` | GET | All real-time KPI metrics, trends, and priorities |
| `/api/products` | GET / POST | List, search, filter, and create products |
| `/api/products/<id>` | GET / PUT / DELETE | In-depth product history, velocities, and CRUD |
| `/api/inventory` | GET | Complete stock table with runway, status, and ADS |
| `/api/inventory/restock` | POST | Trigger purchase replenishment order |
| `/api/inventory/adjust` | POST | Reconcile physical inventory counts |
| `/api/sales/analytics` | GET | Multi-horizon revenue trends, margins, and anomalies |
| `/api/alerts` | GET | All deterministic alerts, priorities, and revenue at risk |
| `/api/simulator/run` | POST | Execute What-If simulation with custom modifiers |
| `/api/copilot/chat` | POST | Grounded Gemini AI natural language decision support |
| `/api/copilot/history` | GET / DELETE | AI query history persistent log |
| `/api/data/import` | POST | Validated multipart CSV/Excel ingestion |
| `/api/data/template/<type>`| GET | Stream downloadable CSV schema templates |
| `/api/data/seed-sample` | POST | Prime realistic 60-day multi-category retail dataset |
| `/api/data/quality-report`| GET | Comprehensive database integrity audit |

---

## 11. Automated Test Suite

Run unit and integration tests covering the deterministic analytics engine, alert algorithms, What-If simulator, and API routes:

```bash
python -m pytest backend/tests
```

---

## 12. Known Limitations & Future Roadmap

- **Multi-Currency Conversion**: Current monetary calculations assume a single primary currency ($ USD).
- **Barcode Scanner Integration**: Future builds will support direct WebCam barcode/QR code scanning for instant physical count reconciliation.
- **Automated Supplier EDI / Webhook**: Direct purchase order transmission to vendor ERP endpoints.
