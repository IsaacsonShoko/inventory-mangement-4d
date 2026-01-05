# AI Trader System Architecture & Components

This document details the core components of the AI Trading System, explaining their roles, interactions, and implementations.

## 1. 📡 Price Feed
**Role**: The eyes of the system. Continuously ingests real-time market data.
**File**: `backend/services/data_ingestion/mt5_client.py` & `price_feed.py`

*   **Source**: MetaTrader 5 (MT5) Terminal (Direct Binding).
*   **Data Types**: OHLCV (Open, High, Low, Close, Volume), Spreads, Ticks.
*   **Mechanism**:
    *   `MT5Client` maintains a persistent connection to the terminal.
    *   Polls for new candles every 1 minute.
    *   **Backfill**: On startup, automatically fetches the last 1000 candles to ensure indicators are primed.
*   **Output**: Stores data in Supabase `ohlcv` table and updates `last_price_update` system state.

## 2. ⚙️ Trading Engine (Orchestrator)
**Role**: The brain/conductor. Manages the main event loop and coordinates all services.
**File**: `backend/main.py`

*   **Responsibilities**:
    1.  **Scheduling**: Runs tasks (e.g., `trading_cycle`, `housekeeper`, `sync_positions`) at defined intervals using `schedule` library.
    2.  **Signal Generation**: Calls `MLInference` to get predictions.
    3.  **Execution**: Passes valid signals to the `Executor`.
    4.  **Health Checks**: Updates heartbeat for the frontend dashboard.
*   **Cycle**: 1-Minute Heartbeat.

## 3. ⚔️ Executor
**Role**: The hands. Responsible for placing, modifying, and closing orders.
**File**: `backend/services/trading_engine/executor.py`

*   **Logic**:
    *   **Pre-Trade Checks**: Verifies spread, market hours, and account balance.
    *   **Pattern Memory**: Queries `PatternMemory` (Vector Search) to validate if the current setup historically leads to profit. *Signals are vetoed if pattern match is poor.*
    *   **Order Placement**: Sends `OrderSend` commands to MT5 with calculated Lot Size, SL, and TP.
*   **Safety**: "Fails Safe" - if any check fails, no trade is taken.

## 4. 🛡️ Risk Sentinel
**Role**: The shield. Independent process ensuring account safety.
**File**: `backend/services/trading_engine/risk_sentinel.py`

*   **Architecture**: Runs as a **Separate Process** (`start_sentinel.bat`). It can close trades even if the main Trading Engine hangs/crashes.
*   **Key Functions**:
    1.  **Dynamic Stop Loss**: Calculates SL based on ATR (Volatility).
    2.  **Daily Loss Limit**: Force-closes all positions if `MAX_DAILY_LOSS` (3%) is hit.
    3.  **Max Drawdown**: Monitors open equity.
    4.  **Position Sizing**: Ensures 1% risk per trade based on SL distance.

## 5. 🔭 Scout (Concept / Feature Engine)
**Role**: The lookout. Scans markets for opportunities and computes technical features.
**Implementation**: Integrated into `backend/services/feature_engine/technical.py` & `MLInference`.

*   **Function**:
    *   Calculates indicators (RSI, MACD, EMA, Bollinger Bands) using `pandas-ta`.
    *   Prepares the "Feature Vector" for the ML models.
*   *Note: While not a standalone process named "Scout" in the codebase, this logic resides in the `engineer_features` methods of the Trainer and Inference classes.*

## 6. 📊 Analytics Manager (Performance Review)
**Role**: The auditor. Tracks performance and decides if models need fixing.
**Implementation**: `backend/services/data_management/analytics.py` (Logic distributed in `Housekeeper` and Supabase Views).

*   **Metrics**:
    *   **Win Rate**: % of profitable trades.
    *   **Profit Factor**: Gross Profit / Gross Loss.
    *   **Precision**: Accuracy of "Buy" signals.
*   **Review**:
    *   Trades are logged to Supabase `trades` table.
    *   `Housekeeper` ensures data retention policies (e.g., keeps Trades forever, rotates high-frequency OHLCV).
    *   *Future*: Automated weekly reports via Telegram (currently manual/dashboard).

## 7. 🔄 Retraining Service
**Role**: The improver. Automatically updates ML models when performance degrades.
**File**: `backend/services/ml_service/retraining_service.py`

*   **Trigger**: Can be triggered manually or by "Analyst Bot" (future).
*   **Process**:
    1.  **Training**: Re-runs XGBoost training on latest Supabase data (including recent trades).
    2.  **Validation**: "Backtests" the new model against a holdout set.
    3.  **Promotion**: If New Accuracy > Threshold (e.g., 52%), replaces the live `.joblib` file.
    4.  **Reload**: Signals the Trading Engine to reload models without restart.

## 8. 🌍 Market Status & Assets
**Role**: The environment. Tracks which assets are active and global market conditions.
**File**: `backend/services/system/health_monitor.py` & Supabase `system_state`.

*   **Asset Management**:
    *   Controlled via Supabase keys: `trade_xauusdm`, `trade_btcusd`, etc.
    *   `settings.py` defines the *potential* list, Supabase defines the *active* list.
*   **Market Context**:
    *   **News Blackout**: Pauses trading during high-impact news (FOMC, NFP).
    *   **Macro Feed**: Tracks DXY (Dollar), US10Y (Yields), and VIX (Fear) to adjust strategy bias.

---

### System Data Flow

1.  **MT5** -> **Price Feed** -> **Supabase (OHLCV)**
2.  **Scout (Feature Engine)** reads **OHLCV** -> Calculates **Features**
3.  **ML Inference** reads **Features** -> Predicts **Signal**
4.  **Trading Engine** receives **Signal** -> Checks **Pattern Memory** -> Sends to **Executor**
5.  **Executor** -> **MT5 (Order)**
6.  **Risk Sentinel** monitors **MT5 (Account)** -> Closes if Risk Violation
7.  **Retraining Service** monitors **Performance** -> Updates **ML Models**
