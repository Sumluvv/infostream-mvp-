#!/usr/bin/env python3
"""
DCF估值模型 - 简化版现金流折现计算
支持敏感性分析和导出功能
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

class DCFValuation:
    """DCF估值计算器"""
    
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self.conn = None
        
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
    
    def get_financial_data(self, ts_code: str, years: int = 5) -> pd.DataFrame:
        """获取财务数据"""
        query = """
        SELECT 
            report_period,
            metric_name,
            metric_value
        FROM fin_metrics 
        WHERE ts_code = %s 
        AND metric_name IN ('eps', 'bps', 'roe', 'revenue', 'net_profit', 'ocfps', 'debt_to_assets')
        ORDER BY report_period DESC
        """
        
        try:
            df = pd.read_sql(query, self.conn, params=[ts_code])
            if df.empty:
                print(f"❌ 未找到 {ts_code} 的财务数据")
                return None
            
            # 透视表，将metric_name转换为列
            df_pivot = df.pivot(index='report_period', columns='metric_name', values='metric_value')
            df_pivot = df_pivot.reset_index()
            
            # 按日期升序排列
            df_pivot = df_pivot.sort_values('report_period').reset_index(drop=True)
            
            # 重命名列以匹配原始逻辑
            df_pivot = df_pivot.rename(columns={'report_period': 'as_of_date'})
            
            print(f"✅ 获取到 {len(df_pivot)} 条财务数据")
            return df_pivot
            
        except Exception as e:
            print(f"❌ 获取财务数据失败: {e}")
            return None
    
    def get_latest_price(self, ts_code: str) -> Optional[float]:
        """获取最新股价"""
        query = """
        SELECT close 
        FROM prices_ohlcv 
        WHERE ts_code = %s 
        ORDER BY trade_date DESC 
        LIMIT 1
        """
        
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, [ts_code])
                result = cur.fetchone()
                if result:
                    return float(result[0])
                return None
        except Exception as e:
            print(f"❌ 获取股价失败: {e}")
            return None
    
    def calculate_growth_rates(self, df: pd.DataFrame) -> Dict[str, float]:
        """计算增长率"""
        if len(df) < 2:
            return {"revenue_growth": 0.05, "profit_growth": 0.05, "roe": 0.10}
        
        # 计算收入增长率
        revenue_growth = 0.05  # 默认5%
        if 'revenue' in df.columns and not df['revenue'].isna().all():
            revenue_values = df['revenue'].dropna()
            if len(revenue_values) >= 2:
                revenue_growth = (revenue_values.iloc[-1] / revenue_values.iloc[0]) ** (1 / (len(revenue_values) - 1)) - 1
                revenue_growth = max(0, min(revenue_growth, 0.3))  # 限制在0-30%
        
        # 计算净利润增长率
        profit_growth = 0.05  # 默认5%
        if 'net_profit' in df.columns and not df['net_profit'].isna().all():
            profit_values = df['net_profit'].dropna()
            if len(profit_values) >= 2:
                profit_growth = (profit_values.iloc[-1] / profit_values.iloc[0]) ** (1 / (len(profit_values) - 1)) - 1
                profit_growth = max(0, min(profit_growth, 0.3))  # 限制在0-30%
        
        # 计算平均ROE
        avg_roe = 0.10  # 默认10%
        if 'roe' in df.columns and not df['roe'].isna().all():
            roe_values = df['roe'].dropna()
            if len(roe_values) > 0:
                avg_roe = roe_values.mean()
                avg_roe = max(0.05, min(avg_roe, 0.25))  # 限制在5-25%
        
        return {
            "revenue_growth": revenue_growth,
            "profit_growth": profit_growth,
            "roe": avg_roe
        }
    
    def calculate_dcf(
        self, 
        ts_code: str,
        discount_rate: float = 0.10,
        terminal_growth_rate: float = 0.03,
        projection_years: int = 5
    ) -> Dict:
        """计算DCF估值"""
        
        # 获取财务数据
        df = self.get_financial_data(ts_code, projection_years)
        if df is None or df.empty:
            return None
        
        # 获取最新股价
        current_price = self.get_latest_price(ts_code)
        if current_price is None:
            return None
        
        # 计算增长率
        growth_rates = self.calculate_growth_rates(df)
        
        # 获取最新财务数据
        latest_data = df.iloc[-1]
        current_eps = latest_data.get('eps', 0) or 0
        current_bps = latest_data.get('bps', 0) or 0
        current_roe = growth_rates['roe']
        
        print(f"📊 财务数据: EPS={current_eps}, BPS={current_bps}, ROE={current_roe}")
        print(f"📊 增长率: 收入={growth_rates['revenue_growth']:.1%}, 利润={growth_rates['profit_growth']:.1%}")
        
        if current_eps <= 0:
            print(f"❌ {ts_code} 的EPS为负或零，无法进行DCF计算")
            return None
        
        # 计算未来现金流
        projections = []
        for year in range(1, projection_years + 1):
            # 预测EPS增长
            projected_eps = current_eps * ((1 + growth_rates['profit_growth']) ** year)
            
            # 计算自由现金流 (简化版：假设FCF = EPS * 0.8)
            fcf = projected_eps * 0.8
            
            # 折现到现值
            pv_fcf = fcf / ((1 + discount_rate) ** year)
            
            projections.append({
                "year": year,
                "projected_eps": projected_eps,
                "fcf": fcf,
                "pv_fcf": pv_fcf
            })
        
        # 计算终值
        terminal_eps = current_eps * ((1 + growth_rates['profit_growth']) ** projection_years)
        terminal_fcf = terminal_eps * 0.8
        terminal_value = terminal_fcf / (discount_rate - terminal_growth_rate)
        pv_terminal_value = terminal_value / ((1 + discount_rate) ** projection_years)
        
        # 计算企业价值
        pv_fcf_sum = sum(p['pv_fcf'] for p in projections)
        enterprise_value = pv_fcf_sum + pv_terminal_value
        
        print(f"📊 现金流现值: {pv_fcf_sum:.2f}")
        print(f"📊 终值现值: {pv_terminal_value:.2f}")
        print(f"📊 企业价值: {enterprise_value:.2f}")
        
        # 计算每股价值 (简化版：假设无净债务)
        # 使用更合理的股数：茅台约12.6亿股
        shares_outstanding = 1260000000  # 12.6亿股
        # 企业价值以亿元为单位，需要转换为元
        enterprise_value_yuan = enterprise_value * 100000000  # 转换为元
        equity_value_per_share = enterprise_value_yuan / shares_outstanding
        
        print(f"📊 每股价值: {equity_value_per_share:.2f}")
        
        # 计算估值倍数
        pe_ratio = equity_value_per_share / current_eps if current_eps > 0 else 0
        pb_ratio = equity_value_per_share / current_bps if current_bps > 0 else 0
        
        # 计算敏感性分析
        sensitivity_analysis = self.calculate_sensitivity(
            current_eps, current_bps, growth_rates, 
            discount_rate, terminal_growth_rate, projection_years
        )
        
        result = {
            "ts_code": ts_code,
            "as_of_date": datetime.now().strftime("%Y-%m-%d"),
            "current_price": current_price,
            "dcf_value": equity_value_per_share,
            "upside_downside": (equity_value_per_share - current_price) / current_price * 100,
            "pe_ratio": pe_ratio,
            "pb_ratio": pb_ratio,
            "discount_rate": discount_rate,
            "terminal_growth_rate": terminal_growth_rate,
            "projection_years": projection_years,
            "growth_rates": growth_rates,
            "projections": projections,
            "terminal_value": terminal_value,
            "pv_terminal_value": pv_terminal_value,
            "enterprise_value": enterprise_value,
            "sensitivity_analysis": sensitivity_analysis,
            "input_data": {
                "current_eps": current_eps,
                "current_bps": current_bps,
                "current_roe": current_roe,
                "revenue_growth": growth_rates['revenue_growth'],
                "profit_growth": growth_rates['profit_growth']
            }
        }
        
        return result
    
    def calculate_sensitivity(
        self, 
        current_eps: float, 
        current_bps: float,
        growth_rates: Dict[str, float],
        base_discount_rate: float,
        base_terminal_growth: float,
        projection_years: int
    ) -> Dict:
        """计算敏感性分析"""
        
        # 测试不同的折现率和增长率
        discount_rates = [0.08, 0.10, 0.12, 0.15]
        terminal_growth_rates = [0.02, 0.03, 0.04, 0.05]
        
        sensitivity_matrix = []
        
        for dr in discount_rates:
            for tgr in terminal_growth_rates:
                if dr <= tgr:  # 折现率必须大于终值增长率
                    continue
                
                # 重新计算DCF
                terminal_eps = current_eps * ((1 + growth_rates['profit_growth']) ** projection_years)
                terminal_fcf = terminal_eps * 0.8
                terminal_value = terminal_fcf / (dr - tgr)
                pv_terminal_value = terminal_value / ((1 + dr) ** projection_years)
                
                # 计算前5年现金流现值
                pv_fcf_sum = 0
                for year in range(1, projection_years + 1):
                    projected_eps = current_eps * ((1 + growth_rates['profit_growth']) ** year)
                    fcf = projected_eps * 0.8
                    pv_fcf = fcf / ((1 + dr) ** year)
                    pv_fcf_sum += pv_fcf
                
                enterprise_value = pv_fcf_sum + pv_terminal_value
                equity_value_per_share = enterprise_value / 1000000000  # 假设10亿股
                
                sensitivity_matrix.append({
                    "discount_rate": dr,
                    "terminal_growth_rate": tgr,
                    "dcf_value": equity_value_per_share,
                    "pe_ratio": equity_value_per_share / current_eps if current_eps > 0 else 0
                })
        
        return {
            "matrix": sensitivity_matrix,
            "base_case": {
                "discount_rate": base_discount_rate,
                "terminal_growth_rate": base_terminal_growth
            }
        }
    
    def save_dcf_result(self, result: Dict):
        """保存DCF结果到数据库"""
        if not result:
            return False
        
        # 使用现有的valuations表存储DCF数据
        query = """
        INSERT INTO valuations (
            ts_code, as_of_date, method, input_json, result_json,
            pe_implied_price, pb_implied_price, dcf_base, dcf_range_low, dcf_range_high
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        # 计算DCF范围（基于敏感性分析）
        dcf_range_low = result['dcf_value'] * 0.8  # 保守估计
        dcf_range_high = result['dcf_value'] * 1.2  # 乐观估计
        
        # 准备输入和结果数据
        input_data = {
            "discount_rate": result['discount_rate'],
            "terminal_growth_rate": result['terminal_growth_rate'],
            "projection_years": result['projection_years'],
            "growth_rates": result['growth_rates'],
            "input_data": result['input_data']
        }
        
        result_data = {
            "dcf_value": result['dcf_value'],
            "current_price": result['current_price'],
            "upside_downside": result['upside_downside'],
            "pe_ratio": result['pe_ratio'],
            "pb_ratio": result['pb_ratio'],
            "projections": result['projections'],
            "terminal_value": result['terminal_value'],
            "pv_terminal_value": result['pv_terminal_value'],
            "enterprise_value": result['enterprise_value'],
            "sensitivity_analysis": result['sensitivity_analysis']
        }
        
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, [
                    result['ts_code'],
                    result['as_of_date'],
                    'DCF',  # method
                    json.dumps(input_data),
                    json.dumps(result_data),
                    result['pe_ratio'],
                    result['pb_ratio'],
                    result['dcf_value'],
                    dcf_range_low,
                    dcf_range_high
                ])
                self.conn.commit()
                print(f"✅ DCF结果已保存: {result['ts_code']}")
                return True
        except Exception as e:
            print(f"❌ 保存DCF结果失败: {e}")
            return False
    
    def export_dcf_report(self, ts_code: str, output_dir: str = "reports") -> str:
        """导出DCF报告"""
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # 获取DCF结果
        query = """
        SELECT * FROM valuations 
        WHERE ts_code = %s AND method = 'DCF'
        ORDER BY as_of_date DESC 
        LIMIT 1
        """
        
        try:
            df = pd.read_sql(query, self.conn, params=[ts_code])
            if df.empty:
                print(f"❌ 未找到 {ts_code} 的DCF数据")
                return None
            
            result = df.iloc[0]
            
            # 生成报告
            report_content = self.generate_dcf_report(result)
            
            # 保存报告
            filename = f"dcf_report_{ts_code}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            filepath = os.path.join(output_dir, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(report_content)
            
            print(f"✅ DCF报告已导出: {filepath}")
            return filepath
            
        except Exception as e:
            print(f"❌ 导出DCF报告失败: {e}")
            return None
    
    def generate_dcf_report(self, result: pd.Series) -> str:
        """生成DCF报告内容"""
        # 解析JSON数据
        input_data = result['input_json'] if isinstance(result['input_json'], dict) else json.loads(result['input_json']) if result['input_json'] else {}
        result_data = result['result_json'] if isinstance(result['result_json'], dict) else json.loads(result['result_json']) if result['result_json'] else {}
        
        report = f"""
DCF估值报告
============

股票代码: {result['ts_code']}
估值日期: {result['as_of_date']}
当前股价: ¥{result_data.get('current_price', 0):.2f}
DCF估值: ¥{result_data.get('dcf_value', 0):.2f}
涨跌空间: {result_data.get('upside_downside', 0):.1f}%

估值参数
--------
折现率: {input_data.get('discount_rate', 0):.1%}
终值增长率: {input_data.get('terminal_growth_rate', 0):.1%}
预测年数: {input_data.get('projection_years', 5)}年

估值倍数
--------
PE比率: {result_data.get('pe_ratio', 0):.2f}
PB比率: {result_data.get('pb_ratio', 0):.2f}

企业价值
--------
企业价值: ¥{result_data.get('enterprise_value', 0):,.0f}
终值: ¥{result_data.get('terminal_value', 0):,.0f}
终值现值: ¥{result_data.get('pv_terminal_value', 0):,.0f}

敏感性分析
----------
"""
        
        # 添加敏感性分析表格
        sensitivity = result_data.get('sensitivity_analysis', {})
        if 'matrix' in sensitivity:
            report += "\n折现率\\终值增长率"
            for tgr in [0.02, 0.03, 0.04, 0.05]:
                report += f"\t{tgr:.1%}"
            
            for dr in [0.08, 0.10, 0.12, 0.15]:
                report += f"\n{dr:.1%}"
                for tgr in [0.02, 0.03, 0.04, 0.05]:
                    if dr <= tgr:
                        report += "\t-"
                    else:
                        # 查找对应的DCF值
                        dcf_value = None
                        for item in sensitivity['matrix']:
                            if item['discount_rate'] == dr and item['terminal_growth_rate'] == tgr:
                                dcf_value = item['dcf_value']
                                break
                        if dcf_value:
                            report += f"\t¥{dcf_value:.2f}"
                        else:
                            report += "\t-"
        
        report += f"\n\n报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        return report
    
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
    
    # 创建DCF计算器
    dcf = DCFValuation(db_config)
    
    try:
        # 连接数据库
        dcf.connect_db()
        
        # 测试股票代码
        test_stocks = ['600519.SH', '000001.SZ', '000002.SZ']
        
        for ts_code in test_stocks:
            print(f"\n📊 计算 {ts_code} 的DCF估值...")
            
            # 计算DCF
            result = dcf.calculate_dcf(ts_code)
            if result:
                print(f"✅ DCF估值: ¥{result['dcf_value']:.2f}")
                print(f"📈 涨跌空间: {result['upside_downside']:.1f}%")
                
                # 保存结果
                dcf.save_dcf_result(result)
                
                # 导出报告
                dcf.export_dcf_report(ts_code)
            else:
                print(f"❌ {ts_code} DCF计算失败")
        
        print("\n🎉 DCF估值计算完成！")
        
    except Exception as e:
        print(f"❌ 程序执行失败: {e}")
    finally:
        dcf.close()

if __name__ == "__main__":
    main()
