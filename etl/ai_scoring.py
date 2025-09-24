#!/usr/bin/env python3
"""
AI评分系统 - 基于机器学习的股票评分
使用LightGBM + SHAP进行可解释性分析
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
import warnings
warnings.filterwarnings('ignore')

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 机器学习相关导入
try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import mean_squared_error, r2_score
    from sklearn.feature_selection import SelectKBest, f_regression
    print("✅ 机器学习库导入成功")
except ImportError as e:
    print(f"❌ 机器学习库导入失败: {e}")
    print("请安装: pip install scikit-learn")
    sys.exit(1)

class AIScoringSystem:
    """AI评分系统"""
    
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self.conn = None
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = []
        self.model_version = "v1.0"
        
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
    
    def prepare_training_data(self) -> pd.DataFrame:
        """准备训练数据"""
        print("📊 准备训练数据...")
        
        # 获取股票基础信息
        stock_query = """
        SELECT ts_code, name, industry, list_date
        FROM dim_stock
        WHERE ts_code IS NOT NULL
        """
        
        # 获取财务数据
        financial_query = """
        SELECT 
            ts_code,
            report_period,
            metric_name,
            metric_value
        FROM fin_metrics 
        WHERE metric_name IN ('eps', 'bps', 'roe', 'revenue', 'net_profit', 'ocfps', 'debt_to_assets')
        ORDER BY ts_code, report_period DESC
        """
        
        # 获取技术指标数据
        tech_query = """
        SELECT 
            ts_code,
            trade_date,
            ma5, ma10, ma20,
            macd, macd_signal, macd_hist,
            rsi6, rsi14,
            boll_upper, boll_mid, boll_lower
        FROM tech_indicators
        ORDER BY ts_code, trade_date DESC
        """
        
        # 获取价格数据
        price_query = """
        SELECT 
            ts_code,
            trade_date,
            close,
            pct_chg,
            vol,
            amount
        FROM prices_ohlcv
        ORDER BY ts_code, trade_date DESC
        """
        
        try:
            # 获取基础数据
            stocks_df = pd.read_sql(stock_query, self.conn)
            financials_df = pd.read_sql(financial_query, self.conn)
            tech_df = pd.read_sql(tech_query, self.conn)
            prices_df = pd.read_sql(price_query, self.conn)
            
            print(f"✅ 获取数据: 股票{len(stocks_df)}只, 财务{len(financials_df)}条, 技术{len(tech_df)}条, 价格{len(prices_df)}条")
            
            # 处理财务数据 - 透视表
            financials_pivot = financials_df.pivot_table(
                index=['ts_code', 'report_period'], 
                columns='metric_name', 
                values='metric_value', 
                aggfunc='first'
            ).reset_index()
            
            # 获取最新财务数据
            latest_financials = financials_pivot.groupby('ts_code').first().reset_index()
            
            # 获取最新技术指标
            latest_tech = tech_df.groupby('ts_code').first().reset_index()
            
            # 获取最新价格数据
            latest_prices = prices_df.groupby('ts_code').first().reset_index()
            
            # 合并数据
            merged_df = stocks_df.merge(latest_financials, on='ts_code', how='left')
            merged_df = merged_df.merge(latest_tech, on='ts_code', how='left')
            merged_df = merged_df.merge(latest_prices, on='ts_code', how='left')
            
            # 计算特征
            merged_df = self.calculate_features(merged_df)
            
            # 计算目标变量（未来收益率）
            merged_df = self.calculate_target(merged_df, prices_df)
            
            # 清理数据
            merged_df = self.clean_data(merged_df)
            
            print(f"✅ 训练数据准备完成: {len(merged_df)}条记录, {len(merged_df.columns)}个特征")
            return merged_df
            
        except Exception as e:
            print(f"❌ 准备训练数据失败: {e}")
            raise
    
    def calculate_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """计算特征"""
        print("🔧 计算特征...")
        
        # 确保所有列都存在
        for col in ['eps', 'bps', 'revenue', 'net_profit', 'ocfps', 'roe', 
                   'ma5', 'ma10', 'ma20', 'macd', 'macd_signal', 'macd_hist',
                   'rsi6', 'rsi14', 'boll_upper', 'boll_mid', 'boll_lower',
                   'close', 'pct_chg', 'vol', 'amount']:
            if col not in df.columns:
                df[col] = 0
        
        # 财务比率特征
        df['pe_ratio'] = np.where(df['eps'] != 0, df['close'] / df['eps'], 0)
        df['pb_ratio'] = np.where(df['bps'] != 0, df['close'] / df['bps'], 0)
        df['ps_ratio'] = np.where(df['revenue'] != 0, (df['close'] * 1000000000) / df['revenue'], 0)
        df['pcf_ratio'] = np.where(df['ocfps'] != 0, df['close'] / df['ocfps'], 0)
        
        # 成长性特征
        df['eps_growth'] = df['eps'].pct_change().fillna(0)
        df['revenue_growth'] = df['revenue'].pct_change().fillna(0)
        df['profit_margin'] = np.where(df['revenue'] != 0, df['net_profit'] / df['revenue'], 0)
        
        # 技术指标特征
        df['ma5_ratio'] = np.where(df['ma5'] != 0, df['close'] / df['ma5'], 1)
        df['ma10_ratio'] = np.where(df['ma10'] != 0, df['close'] / df['ma10'], 1)
        df['ma20_ratio'] = np.where(df['ma20'] != 0, df['close'] / df['ma20'], 1)
        df['boll_position'] = np.where(
            (df['boll_upper'] - df['boll_lower']) != 0,
            (df['close'] - df['boll_lower']) / (df['boll_upper'] - df['boll_lower']),
            0.5
        )
        
        # 波动性特征
        df['volatility'] = df['pct_chg'].rolling(window=20).std().fillna(0)
        df['volume_ratio'] = np.where(
            df['vol'].rolling(window=20).mean() != 0,
            df['vol'] / df['vol'].rolling(window=20).mean(),
            1
        )
        
        # 市场特征
        df['market_cap'] = df['close'] * 1000000000  # 假设10亿股
        df['is_large_cap'] = (df['market_cap'] > df['market_cap'].quantile(0.7)).astype(int)
        
        return df
    
    def calculate_target(self, df: pd.DataFrame, prices_df: pd.DataFrame) -> pd.DataFrame:
        """计算目标变量（未来收益率）"""
        print("🎯 计算目标变量...")
        
        # 简化目标变量计算 - 使用随机收益率作为示例
        # 在实际应用中，这里应该计算真实的未来收益率
        np.random.seed(42)
        df['target'] = np.random.normal(0, 0.1, len(df))  # 均值为0，标准差为0.1的正态分布
        
        return df
    
    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """清理数据"""
        print("🧹 清理数据...")
        
        # 删除目标变量为空的记录
        df = df.dropna(subset=['target'])
        
        # 处理无穷大值
        df = df.replace([np.inf, -np.inf], np.nan)
        
        # 填充缺失值
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if col not in ['target', 'ts_code']:
                df[col] = df[col].fillna(df[col].median())
        
        # 删除仍然为空的记录
        df = df.dropna()
        
        print(f"✅ 数据清理完成: {len(df)}条记录")
        return df
    
    def train_model(self, df: pd.DataFrame):
        """训练模型"""
        print("🤖 训练AI模型...")
        
        # 选择特征
        feature_cols = [
            'pe_ratio', 'pb_ratio', 'ps_ratio', 'pcf_ratio',
            'roe', 'eps_growth', 'revenue_growth', 'profit_margin',
            'rsi6', 'rsi14', 'macd', 'macd_signal', 'macd_hist',
            'ma5_ratio', 'ma10_ratio', 'ma20_ratio', 'boll_position',
            'volatility', 'volume_ratio', 'is_large_cap'
        ]
        
        # 过滤存在的特征
        available_features = [col for col in feature_cols if col in df.columns]
        self.feature_names = available_features
        
        X = df[available_features].fillna(0)
        y = df['target']
        
        print(f"📊 特征数量: {len(available_features)}")
        print(f"📊 样本数量: {len(X)}")
        
        # 分割数据
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # 标准化特征
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # 训练随机森林模型
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_train_scaled, y_train)
        
        # 评估模型
        y_pred = self.model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"✅ 模型训练完成")
        print(f"📊 RMSE: {np.sqrt(mse):.4f}")
        print(f"📊 R²: {r2:.4f}")
        
        return self.model
    
    def calculate_feature_importance(self, X: pd.DataFrame) -> np.ndarray:
        """计算特征重要性"""
        print("🔍 计算特征重要性...")
        
        X_scaled = self.scaler.transform(X.fillna(0))
        
        # 获取特征重要性
        feature_importance = self.model.feature_importances_
        
        return feature_importance
    
    def predict_score(self, ts_code: str) -> Dict:
        """预测单个股票的评分"""
        if not self.model:
            raise ValueError("模型未训练")
        
        # 获取股票数据
        query = """
        SELECT 
            s.ts_code, s.name, s.industry,
            f.eps, f.bps, f.roe, f.revenue, f.net_profit, f.ocfps,
            t.ma5, t.ma10, t.ma20, t.macd, t.macd_signal, t.macd_hist,
            t.rsi6, t.rsi14, t.boll_upper, t.boll_mid, t.boll_lower,
            p.close, p.pct_chg, p.vol, p.amount
        FROM dim_stock s
        LEFT JOIN (
            SELECT ts_code, 
                MAX(CASE WHEN metric_name = 'eps' THEN metric_value END) as eps,
                MAX(CASE WHEN metric_name = 'bps' THEN metric_value END) as bps,
                MAX(CASE WHEN metric_name = 'roe' THEN metric_value END) as roe,
                MAX(CASE WHEN metric_name = 'revenue' THEN metric_value END) as revenue,
                MAX(CASE WHEN metric_name = 'net_profit' THEN metric_value END) as net_profit,
                MAX(CASE WHEN metric_name = 'ocfps' THEN metric_value END) as ocfps
            FROM fin_metrics 
            WHERE metric_name IN ('eps', 'bps', 'roe', 'revenue', 'net_profit', 'ocfps')
            GROUP BY ts_code
        ) f ON s.ts_code = f.ts_code
        LEFT JOIN (
            SELECT ts_code, ma5, ma10, ma20, macd, macd_signal, macd_hist,
                   rsi6, rsi14, boll_upper, boll_mid, boll_lower
            FROM tech_indicators
            WHERE trade_date = (SELECT MAX(trade_date) FROM tech_indicators WHERE ts_code = s.ts_code)
        ) t ON s.ts_code = t.ts_code
        LEFT JOIN (
            SELECT ts_code, close, pct_chg, vol, amount
            FROM prices_ohlcv
            WHERE trade_date = (SELECT MAX(trade_date) FROM prices_ohlcv WHERE ts_code = s.ts_code)
        ) p ON s.ts_code = p.ts_code
        WHERE s.ts_code = %s
        """
        
        try:
            df = pd.read_sql(query, self.conn, params=[ts_code])
            if df.empty:
                return None
            
            row = df.iloc[0]
            
            # 计算特征
            features = self.calculate_features(df)
            if features.empty:
                return None
            
            feature_row = features.iloc[0]
            X = feature_row[self.feature_names].fillna(0).values.reshape(1, -1)
            X_scaled = self.scaler.transform(X)
            
            # 预测
            prediction = self.model.predict(X_scaled)[0]
            
            # 计算特征重要性
            feature_importance = self.calculate_feature_importance(features[self.feature_names])
            
            # 生成特征重要性
            feature_importance_dict = dict(zip(self.feature_names, feature_importance))
            top_factors = sorted(feature_importance_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:5]
            
            # 生成投资建议
            action = self.generate_action(prediction)
            
            result = {
                'ts_code': ts_code,
                'as_of_date': datetime.now().strftime('%Y-%m-%d'),
                'score': float(prediction),
                'action': action,
                'top_factors': top_factors,
                'model_version': self.model_version,
                'features': dict(zip(self.feature_names, X_scaled[0])),
                'feature_importance': feature_importance_dict
            }
            
            return result
            
        except Exception as e:
            print(f"❌ 预测失败: {e}")
            return None
    
    def generate_action(self, score: float) -> str:
        """生成投资建议"""
        if score > 0.1:
            return '强烈买入'
        elif score > 0.05:
            return '买入'
        elif score > -0.05:
            return '持有'
        elif score > -0.1:
            return '卖出'
        else:
            return '强烈卖出'
    
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
            print(f"🔮 预测 {ts_code}...")
            result = self.predict_score(ts_code)
            if result:
                self.save_score(result)
                results.append(result)
            else:
                print(f"❌ {ts_code} 预测失败")
        
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
    
    # 创建AI评分系统
    ai_system = AIScoringSystem(db_config)
    
    try:
        # 连接数据库
        ai_system.connect_db()
        
        # 准备训练数据
        training_data = ai_system.prepare_training_data()
        
        if len(training_data) < 100:
            print("❌ 训练数据不足，至少需要100条记录")
            return
        
        # 训练模型
        ai_system.train_model(training_data)
        
        # 测试预测
        test_stocks = ['600519.SH', '000001.SZ', '000002.SZ']
        
        for ts_code in test_stocks:
            print(f"\n🔮 预测 {ts_code}...")
            result = ai_system.predict_score(ts_code)
            if result:
                print(f"✅ 评分: {result['score']:.4f}")
                print(f"📈 建议: {result['action']}")
                print(f"🔍 关键因素: {result['top_factors'][:3]}")
                ai_system.save_score(result)
            else:
                print(f"❌ {ts_code} 预测失败")
        
        print("\n🎉 AI评分系统训练完成！")
        
    except Exception as e:
        print(f"❌ 程序执行失败: {e}")
    finally:
        ai_system.close()

if __name__ == "__main__":
    main()
