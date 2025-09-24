import os
import sys
import pandas as pd
from dotenv import load_dotenv
try:
    import psycopg as psycopg
except Exception:
    import psycopg2 as psycopg
from ta.trend import SMAIndicator, MACD
from ta.momentum import RSIIndicator
from ta.volatility import BollingerBands

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

PG_DSN = {
    'host': os.getenv('PGHOST', 'localhost'),
    'port': int(os.getenv('PGPORT', '5432')),
    'dbname': os.getenv('PGDATABASE', 'infostream'),
    'user': os.getenv('PGUSER', 'infostream'),
    'password': os.getenv('PGPASSWORD', 'infostream'),
}

def compute_for_ts_code(ts_code: str, freq: str = 'D') -> int:
    with psycopg.connect(**PG_DSN) as conn:
        prices = pd.read_sql_query(
            "SELECT trade_date, close, open, high, low, vol FROM prices_ohlcv WHERE ts_code=%s AND freq=%s ORDER BY trade_date",
            conn, params=(ts_code, freq)
        )
        if prices.empty:
            print('No prices for', ts_code)
            return 0
        close = prices['close']
        # MA
        prices['ma5'] = SMAIndicator(close, window=5).sma_indicator()
        prices['ma10'] = SMAIndicator(close, window=10).sma_indicator()
        prices['ma20'] = SMAIndicator(close, window=20).sma_indicator()
        # MACD
        macd = MACD(close=close, window_slow=26, window_fast=12, window_sign=9)
        prices['macd'] = macd.macd()
        prices['macd_signal'] = macd.macd_signal()
        prices['macd_hist'] = macd.macd_diff()
        # RSI
        prices['rsi6'] = RSIIndicator(close=close, window=6).rsi()
        prices['rsi14'] = RSIIndicator(close=close, window=14).rsi()
        # BOLL
        bb = BollingerBands(close=close, window=20, window_dev=2)
        prices['boll_upper'] = bb.bollinger_hband()
        prices['boll_mid'] = bb.bollinger_mavg()
        prices['boll_lower'] = bb.bollinger_lband()
        # Prepare rows
        rows = [
            (
                ts_code,
                pd.to_datetime(r['trade_date']).date(),
                freq,
                _to_float(r['ma5']), _to_float(r['ma10']), _to_float(r['ma20']),
                _to_float(r['macd']), _to_float(r['macd_signal']), _to_float(r['macd_hist']),
                _to_float(r['rsi6']), _to_float(r['rsi14']),
                _to_float(r['boll_upper']), _to_float(r['boll_mid']), _to_float(r['boll_lower'])
            )
            for _, r in prices.iterrows()
        ]
        with conn.cursor() as cur:
            sql = (
                "INSERT INTO tech_indicators (ts_code, trade_date, freq, ma5, ma10, ma20, macd, macd_signal, macd_hist, rsi6, rsi14, boll_upper, boll_mid, boll_lower) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
                "ON CONFLICT (ts_code, trade_date, freq) DO UPDATE SET "
                "ma5=EXCLUDED.ma5, ma10=EXCLUDED.ma10, ma20=EXCLUDED.ma20, macd=EXCLUDED.macd, macd_signal=EXCLUDED.macd_signal, macd_hist=EXCLUDED.macd_hist, "
                "rsi6=EXCLUDED.rsi6, rsi14=EXCLUDED.rsi14, boll_upper=EXCLUDED.boll_upper, boll_mid=EXCLUDED.boll_mid, boll_lower=EXCLUDED.boll_lower"
            )
            cur.executemany(sql, rows)
            conn.commit()
        return len(rows)

def _to_float(x):
    try:
        return float(x) if pd.notna(x) else None
    except Exception:
        return None

if __name__ == '__main__':
    code = sys.argv[1] if len(sys.argv) > 1 else None
    if not code:
        print('Usage: python compute_indicators.py <ts_code> [freq]')
        sys.exit(1)
    freq = sys.argv[2] if len(sys.argv) > 2 else 'D'
    n = compute_for_ts_code(code, freq)
    print(f'Computed {n} indicator rows for {code}')
