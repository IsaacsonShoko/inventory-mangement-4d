# New Asset Integration Guide

This guide details the end-to-end process for introducing a new asset (e.g., **US500**, **BTCUSD**, **EURJPY**) into the AI Trading System. Following this procedure ensures the asset is fully assimilated, tradeable, and integrated with all system features without introducing bugs.

---

## 🛑 Phase 1: Pre-Integration Analysis (The "Edge" Check)

Before adding an asset, you must verify it has a tradeable edge and select the optimal timeframe.

### 1.1 Liquidity & Spread Analysis
*   **Goal**: Ensure the asset is cost-effective to trade.
*   **Check**:
    *   **Spread**: Must be < 0.02% of price (e.g., Gold spread < 40 cents). High spread kills ML edge.
    *   **Session**: Does it trade 24/5 or have gaps? (Indices have gaps; Crypto is 24/7).
    *   **Action**: If spread is too high, **DO NOT ADD**.

### 1.2 Timeframe Selection (Backtesting)
*   **Goal**: Determine which timeframe (M15, H1, H4) yields the highest predictive accuracy.
*   **Tool**: `backend/services/ml_service/base_trainer.py`
*   **Process**:
    1.  **Fetch Data**: Use `mt5_client` to download 5,000+ candles for M15, H1, and H4.
    2.  **Train Pilot Models**: Run `BaseTrainer` on each timeframe.
    3.  **Compare Metrics**:
        *   **Precision**: Must be > 55%.
        *   **Win Rate**: Must be > 50%.
        *   **Profit Factor**: Must be > 1.2.
    4.  **Selection**: Pick the timeframe with the best *stable* performance.
        *   *Crypto*: Usually H1 or H4 (too much noise on M15).
        *   *Forex*: M15 or H1.
        *   *Indices*: M15 (Scalping) or D1 (Swing).

### 1.3 Correlation Check
*   **Goal**: Avoid over-exposure to correlated assets (e.g., adding EURUSD when you already trade GBPUSD and AUDUSD).
*   **Action**: If correlation > 0.85 with an existing asset, reduce risk settings or skip.

---

## ⚙️ Phase 2: Configuration & Infrastructure

### 2.1 Update Global Settings
*   **File**: `backend/config/settings.py`
*   **Action**: Add the **base symbol** to the `SYMBOLS` list.
    ```python
    # settings.py
    @property
    def SYMBOLS(self) -> list:
        return ['XAUUSDm', 'US500m', ...] # Add new asset here
    ```

### 2.2 Broker Symbol Mapping
*   **File**: `backend/services/data_ingestion/mt5_client.py`
*   **Action**: Ensure the broker's specific symbol format is mapped.
    ```python
    # mt5_client.py
    SYMBOL_MAP = {
        # ...
        'US500': ['US500', 'US500m', 'SPX500'], # Add variants
    }
    ```

### 2.3 Enable in Database (Supabase)
*   **Action**: You must explicitly enable the asset in the `system_state` table.
*   **SQL/Dashboard**:
    *   Key: `trade_{symbol_lowercase}` (e.g., `trade_us500m`)
    *   Value: `true`

---

## 🧠 Phase 3: Data Intelligence & ML Model

### 3.1 News Sentiment Calibration
*   **File**: `backend/services/vector_engine/news_embeddings.py`
*   **Action**: If the asset belongs to a new sector (e.g., Crypto), add semantic references.
    ```python
    SENTIMENT_REFERENCES = {
        # ...
        'crypto_bullish': ["Bitcoin hits all-time high", "SEC approves ETF"],
        'crypto_bearish': ["Exchange hack", "Regulatory crackdown"]
    }
    ```
*   **Logic**: Update `analyze_sentiment()` to calculate `crypto_impact` and include it in the global score.

### 3.2 Train & Deploy Model
*   **Step 1: Train**: Use your data from Phase 1 to train the final production model.
*   **Step 2: Save**: Export the model as `.joblib` or `.json` (XGBoost).
*   **Step 3: Deploy**: Place file in `backend/models/` (e.g., `US500_h1_v1.joblib`).

### 3.3 Register in Inference Engine
*   **File**: `backend/services/ml_service/inference.py`
*   **Action**: Map the symbol and timeframe to the model file.
    ```python
    # inference.py
    ASSET_MAP = {
        # ...
        'US500m': {
            'H1': {
                'file': 'US500_h1_v1.joblib',
                'type': 'sklearn', # or 'booster'
                'legacy': False,
                'yahoo': '^GSPC' # For macro correlation/fallback
            }
        }
    }
    ```

---

## ⚡ Phase 4: Trading Engine & Execution

### 4.1 Pattern Memory Initialization
*   **Concept**: The system needs historical context (Vector Memory) to validate signals.
*   **Action**:
    1.  Start the system (`start_all.bat`).
    2.  Wait 10-15 minutes. The `mt5_client` will automatically backfill the last 1000 candles into Supabase `ohlcv`.
    3.  **Verify**: Check Supabase `ohlcv` table for the new symbol.

### 4.2 Risk Management (Sentinel)
*   **Default**: Uses global `RISK_PER_TRADE` (e.g., 1%) from `settings.py`.
*   **Custom**: If the asset is highly volatile (e.g., Crypto), you may want to hardcode a lower risk in `executor.py` or create a `RISK_MAP` in `settings.py`.

---

## 📊 Phase 5: Post-Integration & Maintenance

### 5.1 Verification Checklist
1.  **Logs**: Check `backend.log` for:
    *   `✅ Loaded US500m_H1 from US500_h1_v1.joblib`
    *   `Connected to MT5`
    *   `Subscribing to US500m`
2.  **Telegram**: Send `/status` to the bot. It should list the new asset.
3.  **First Trade**: Watch the first signal. Ensure `Pattern Memory` recommendation is logged.

### 5.2 Analytics Manager
*   **Performance Review**: The system tracks PnL by symbol in Supabase `trades` table.
*   **Review Cycle**: Weekly.
*   **Action**: If Win Rate < 45% after 20 trades, **disable** via Supabase (`trade_us500m = false`) and re-evaluate Phase 1.

### 5.3 Retraining Service
*   **Trigger**: When `Precision` drops below 50% over a rolling 50-trade window.
*   **Process**:
    1.  Export new trade data from Supabase.
    2.  Re-run `BaseTrainer`.
    3.  Replace `.joblib` file in `backend/models/`.
    4.  Restart System.

---

## 📂 File Map for Integration

| Component | File Path | Action |
| :--- | :--- | :--- |
| **Settings** | `backend/config/settings.py` | Add to `SYMBOLS` |
| **Broker Map** | `backend/services/data_ingestion/mt5_client.py` | Update `SYMBOL_MAP` |
| **Sentiment** | `backend/services/vector_engine/news_embeddings.py` | Add References |
| **Model Registry** | `backend/services/ml_service/inference.py` | Update `ASSET_MAP` |
| **Model File** | `backend/models/` | Upload `.joblib` |
| **Database** | Supabase Dashboard | Set `trade_{symbol} = true` |
