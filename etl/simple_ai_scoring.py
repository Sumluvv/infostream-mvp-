#!/usr/bin/env python3
"""
简化AI评分系统 - 基于规则和简单特征的股票评分
"""

import os
import sys
import json
import pandas as pd
import numpy as np
from decimal import Decimal
from datetime import datetime, date
from typing import Dict, List, Tuple, Optional
import psycopg
from psycopg import sql

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class SimpleAIScoringSystem:
    """简化AI评分系统"""
    
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self.conn = None
        self.model_version = "v1.0-simple"
        
    def connect_db(self):
        """连接数据库"""
        try:
            self.conn = psycopg.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                dbname=self.db_config['dbname'],
                user=self.db_config['user'],
                password=self.db_config['password']
            )
            print("✅ 数据库连接成功")
        except Exception as e:
            print(f"❌ 数据库连接失败: {e}")
            raise
    
    def calculate_score(self, ts_code: str) -> Dict:
        """计算股票评分"""
        print(f"🔮 计算 {ts_code} 的AI评分...")
        
        # 获取基础数据
        query = """
        SELECT 
            s.ts_code, s.name, s.industry,
            f.eps, f.bps, f.roe, f.revenue, f.net_profit,
            t.rsi14, t.macd, t.ma5, t.ma20,
            p.close, p.pct_chg, p.vol
        FROM dim_stock s
        LEFT JOIN (
            SELECT ts_code, 
                MAX(CASE WHEN metric_name = 'eps' THEN metric_value END) as eps,
                MAX(CASE WHEN metric_name = 'bps' THEN metric_value END) as bps,
                MAX(CASE WHEN metric_name = 'roe' THEN metric_value END) as roe,
                MAX(CASE WHEN metric_name = 'revenue' THEN metric_value END) as revenue,
                MAX(CASE WHEN metric_name = 'net_profit' THEN metric_value END) as net_profit
            FROM fin_metrics 
            WHERE metric_name IN ('eps', 'bps', 'roe', 'revenue', 'net_profit')
            GROUP BY ts_code
        ) f ON s.ts_code = f.ts_code
        LEFT JOIN (
            SELECT ts_code, rsi14, macd, ma5, ma20
            FROM tech_indicators
            WHERE trade_date = (SELECT MAX(trade_date) FROM tech_indicators WHERE ts_code = %s)
        ) t ON s.ts_code = t.ts_code
        LEFT JOIN (
            SELECT ts_code, close, pct_chg, vol
            FROM prices_ohlcv
            WHERE trade_date = (SELECT MAX(trade_date) FROM prices_ohlcv WHERE ts_code = %s)
        ) p ON s.ts_code = p.ts_code
        WHERE s.ts_code = %s
        """
        
        try:
            df = pd.read_sql(query, self.conn, params=[ts_code, ts_code, ts_code])
            if df.empty:
                return None
            
            row = df.iloc[0]
            
            # 计算基础指标
            pe_ratio = row['close'] / row['eps'] if row['eps'] and row['eps'] > 0 else 0
            pb_ratio = row['close'] / row['bps'] if row['bps'] and row['bps'] > 0 else 0
            roe = row['roe'] if row['roe'] else 0
            rsi = row['rsi14'] if row['rsi14'] else 50
            macd = row['macd'] if row['macd'] else 0
            ma5 = row['ma5'] if row['ma5'] else row['close']
            ma20 = row['ma20'] if row['ma20'] else row['close']
            price_change = row['pct_chg'] if row['pct_chg'] else 0
            
            # 计算评分 (0-100分)
            score = 50  # 基础分
            factors = []
            
            # PE比率评分 (20分)
            if pe_ratio > 0:
                if pe_ratio < 10:
                    pe_score = 20
                    factors.append(("PE较低", 20))
                elif pe_ratio < 20:
                    pe_score = 15
                    factors.append(("PE适中", 15))
                elif pe_ratio < 30:
                    pe_score = 10
                    factors.append(("PE偏高", 10))
                else:
                    pe_score = 5
                    factors.append(("PE过高", 5))
                score += pe_score - 10  # 调整到-5到+10分
            
            # PB比率评分 (15分)
            if pb_ratio > 0:
                if pb_ratio < 1:
                    pb_score = 15
                    factors.append(("PB<1", 15))
                elif pb_ratio < 2:
                    pb_score = 10
                    factors.append(("PB适中", 10))
                elif pb_ratio < 4:
                    pb_score = 5
                    factors.append(("PB偏高", 5))
                else:
                    pb_score = 0
                    factors.append(("PB过高", 0))
                score += pb_score - 7.5  # 调整到-7.5到+7.5分
            
            # ROE评分 (15分)
            if roe > 0:
                if roe > 0.2:
                    roe_score = 15
                    factors.append(("ROE>20%", 15))
                elif roe > 0.15:
                    roe_score = 12
                    factors.append(("ROE>15%", 12))
                elif roe > 0.1:
                    roe_score = 8
                    factors.append(("ROE>10%", 8))
                else:
                    roe_score = 3
                    factors.append(("ROE<10%", 3))
                score += roe_score - 7.5  # 调整到-7.5到+7.5分
            
            # RSI技术指标评分 (10分)
            if rsi < 30:
                rsi_score = 10
                factors.append(("RSI超卖", 10))
            elif rsi < 50:
                rsi_score = 7
                factors.append(("RSI偏低", 7))
            elif rsi < 70:
                rsi_score = 5
                factors.append(("RSI正常", 5))
            else:
                rsi_score = 2
                factors.append(("RSI超买", 2))
            score += rsi_score - 5  # 调整到-5到+5分
            
            # MACD技术指标评分 (10分)
            if macd > 0:
                macd_score = 8
                factors.append(("MACD金叉", 8))
            else:
                macd_score = 3
                factors.append(("MACD死叉", 3))
            score += macd_score - 5  # 调整到-5到+5分
            
            # 均线位置评分 (10分)
            if ma5 and ma20 and row['close'] and row['close'] > ma5 > ma20:
                ma_score = 10
                factors.append(("多头排列", 10))
            elif ma5 and row['close'] and row['close'] > ma5:
                ma_score = 7
                factors.append(("站上5日线", 7))
            elif ma20 and row['close'] and row['close'] > ma20:
                ma_score = 5
                factors.append(("站上20日线", 5))
            else:
                ma_score = 2
                factors.append(("均线下方", 2))
            score += ma_score - 5  # 调整到-5到+5分
            
            # 价格变化评分 (10分)
            if price_change > 5:
                price_score = 10
                factors.append(("大涨", 10))
            elif price_change > 0:
                price_score = 7
                factors.append(("上涨", 7))
            elif price_change > -5:
                price_score = 5
                factors.append(("震荡", 5))
            else:
                price_score = 2
                factors.append(("下跌", 2))
            score += price_score - 5  # 调整到-5到+5分
            
            # 行业评分 (10分) - 简化处理
            industry_score = 5  # 默认中等
            if row['industry'] in ['银行', '保险', '证券']:
                industry_score = 7
                factors.append(("金融行业", 7))
            elif row['industry'] in ['医药', '科技', '新能源']:
                industry_score = 8
                factors.append(("成长行业", 8))
            elif row['industry'] in ['钢铁', '煤炭', '化工']:
                industry_score = 3
                factors.append(("周期行业", 3))
            else:
                factors.append(("其他行业", 5))
            score += industry_score - 5  # 调整到-5到+5分
            
            # 确保评分在0-100范围内
            score = max(0, min(100, score))
            
            # 生成投资建议
            if score >= 80:
                action = "强烈买入"
            elif score >= 70:
                action = "买入"
            elif score >= 60:
                action = "持有"
            elif score >= 40:
                action = "观望"
            else:
                action = "卖出"
            
            # 按重要性排序因素
            top_factors = sorted(factors, key=lambda x: x[1], reverse=True)[:5]
            
            result = {
                'ts_code': ts_code,
                'as_of_date': datetime.now().strftime('%Y-%m-%d'),
                'score': round(score, 2),
                'action': action,
                'top_factors': top_factors,
                'model_version': self.model_version,
                'details': {
                    'pe_ratio': round(pe_ratio, 2),
                    'pb_ratio': round(pb_ratio, 2),
                    'roe': round(roe, 4),
                    'rsi': round(rsi, 2),
                    'macd': round(macd, 4),
                    'price_change': round(price_change, 2),
                    'industry': row['industry']
                }
            }
            
            return result
            
        except Exception as e:
            print(f"❌ 计算评分失败: {e}")
            return None
    
    def save_score(self, result: Dict):
        """保存评分结果"""
        if not result:
            return False
        
        query = """
        INSERT INTO ai_scores (
            ts_code, as_of_date, score, action, top_factors_json, model_version
        ) VALUES (
            %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (ts_code, as_of_date) 
        DO UPDATE SET
            score = EXCLUDED.score,
            action = EXCLUDED.action,
            top_factors_json = EXCLUDED.top_factors_json,
            model_version = EXCLUDED.model_version
        """
        
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, [
                    result['ts_code'],
                    result['as_of_date'],
                    result['score'],
                    result['action'],
                    json.dumps(result['top_factors']),
                    result['model_version']
                ])
                self.conn.commit()
                print(f"✅ AI评分已保存: {result['ts_code']}")
                return True
        except Exception as e:
            print(f"❌ 保存AI评分失败: {e}")
            return False
    
    def batch_predict(self, ts_codes: List[str]) -> List[Dict]:
        """批量预测"""
        results = []
        
        for ts_code in ts_codes:
            result = self.calculate_score(ts_code)
            if result:
                self.save_score(result)
                results.append(result)
                print(f"✅ {ts_code}: {result['score']}分 - {result['action']}")
            else:
                print(f"❌ {ts_code} 评分失败")
        
        return results
    
    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()

def main():
    """主函数"""
    # 加载环境变量
    from dotenv import load_dotenv
    load_dotenv()
    
    # 数据库配置
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'dbname': os.getenv('DB_NAME', 'infostream'),
        'user': os.getenv('DB_USER', 'infostream'),
        'password': os.getenv('DB_PASSWORD', 'infostream123')
    }
    
    # 创建简化AI评分系统
    ai_system = SimpleAIScoringSystem(db_config)
    
    try:
        # 连接数据库
        ai_system.connect_db()
        
        # 测试预测
        test_stocks = ['600519.SH', '000001.SZ', '000002.SZ']
        
        print("🤖 开始AI评分计算...")
        results = ai_system.batch_predict(test_stocks)
        
        print(f"\n🎉 AI评分系统完成！共计算 {len(results)} 只股票")
        
        # 显示结果摘要
        for result in results:
            print(f"📊 {result['ts_code']}: {result['score']}分 - {result['action']}")
            print(f"   关键因素: {', '.join([f[0] for f in result['top_factors'][:3]])}")
        
    except Exception as e:
        print(f"❌ 程序执行失败: {e}")
    finally:
        ai_system.close()

if __name__ == "__main__":
    main()
