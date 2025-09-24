#!/usr/bin/env python3
"""
调试财务数据接口
"""

import os
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

TS_TOKEN = os.getenv('TUSHARE_TOKEN')
if TS_TOKEN:
    import tushare as ts
    pro = ts.pro_api(TS_TOKEN)

def debug_tushare_fina_indicator(ts_code):
    """调试Tushare财务指标接口"""
    print(f"🔍 调试 {ts_code} 的财务指标数据...")
    
    try:
        # 获取财务指标数据
        ind = pro.fina_indicator(ts_code=ts_code)
        print(f"📊 fina_indicator 返回数据形状: {ind.shape}")
        print(f"📋 列名: {list(ind.columns)}")
        
        if not ind.empty:
            print(f"📅 数据范围: {ind['end_date'].min()} 到 {ind['end_date'].max()}")
            print(f"🔢 最新数据样本:")
            latest = ind.iloc[0]
            for col in ['ts_code', 'end_date', 'eps', 'bps', 'roe', 'n_cashflow_act']:
                if col in ind.columns:
                    print(f"   {col}: {latest[col]}")
        
        return ind
    except Exception as e:
        print(f"❌ fina_indicator 错误: {e}")
        return None

def debug_tushare_income(ts_code):
    """调试Tushare利润表接口"""
    print(f"🔍 调试 {ts_code} 的利润表数据...")
    
    try:
        # 获取利润表数据
        inc = pro.income(ts_code=ts_code, start_date="20200101")
        print(f"📊 income 返回数据形状: {inc.shape}")
        print(f"📋 列名: {list(inc.columns)}")
        
        if not inc.empty:
            print(f"📅 数据范围: {inc['end_date'].min()} 到 {inc['end_date'].max()}")
            print(f"🔢 最新数据样本:")
            latest = inc.iloc[0]
            for col in ['ts_code', 'end_date', 'revenue', 'n_income_attr_p']:
                if col in inc.columns:
                    print(f"   {col}: {latest[col]}")
        
        return inc
    except Exception as e:
        print(f"❌ income 错误: {e}")
        return None

if __name__ == "__main__":
    ts_code = "600519.SH"
    
    print("🚀 开始调试财务数据接口...")
    print("=" * 50)
    
    # 调试财务指标
    ind_data = debug_tushare_fina_indicator(ts_code)
    
    print("\n" + "=" * 50)
    
    # 调试利润表
    inc_data = debug_tushare_income(ts_code)
    
    print("\n" + "=" * 50)
    print("✅ 调试完成")
