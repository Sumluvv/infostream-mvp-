import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Pool } from 'pg';

// 创建数据库连接池
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'infostream',
  user: process.env.PGUSER || 'infostream',
  password: process.env.PGPASSWORD || 'infostream',
});

export async function valuationRoutes(fastify: FastifyInstance) {
  // 获取股票估值信息
  fastify.get('/valuation/:ts_code', async (request: FastifyRequest<{ Params: { ts_code: string } }>, reply: FastifyReply) => {
    const { ts_code } = request.params;
    
    try {
      const client = await pool.connect();
      
      try {
        // 获取最新估值数据
        const valuationQuery = `
          SELECT 
            v.ts_code,
            v.as_of_date,
            v.method,
            v.pe_implied_price,
            v.pb_implied_price,
            v.input_json,
            v.result_json,
            v.created_at
          FROM valuations v
          WHERE v.ts_code = $1 
          ORDER BY v.as_of_date DESC, v.created_at DESC
          LIMIT 1
        `;
        
        const valuationResult = await client.query(valuationQuery, [ts_code]);
        
        if (valuationResult.rows.length === 0) {
          return reply.status(404).send({
            error: 'Valuation data not found',
            message: `No valuation data found for ${ts_code}`
          });
        }
        
        const valuation = valuationResult.rows[0];
        
        // 获取最新股价
        const priceQuery = `
          SELECT close, trade_date
          FROM prices_ohlcv 
          WHERE ts_code = $1 
          ORDER BY trade_date DESC 
          LIMIT 1
        `;
        
        const priceResult = await client.query(priceQuery, [ts_code]);
        const currentPrice = priceResult.rows[0]?.close || null;
        
        // 获取最新财务数据
        const financialsQuery = `
          SELECT 
            MAX(CASE WHEN metric_name = 'eps' THEN metric_value END) as eps,
            MAX(CASE WHEN metric_name = 'bps' THEN metric_value END) as bps,
            MAX(CASE WHEN metric_name = 'roe' THEN metric_value END) as roe,
            MAX(CASE WHEN metric_name = 'revenue' THEN metric_value END) as revenue,
            MAX(CASE WHEN metric_name = 'net_profit' THEN metric_value END) as net_profit,
            MAX(report_period) as latest_period
          FROM fin_metrics 
          WHERE ts_code = $1 
          AND metric_name IN ('eps', 'bps', 'roe', 'revenue', 'net_profit')
        `;
        
        const financialsResult = await client.query(financialsQuery, [ts_code]);
        const financials = financialsResult.rows[0];
        
        // 构建响应数据
        const response = {
          ts_code: valuation.ts_code,
          as_of_date: valuation.as_of_date,
          method: valuation.method,
          current_price: currentPrice,
          financials: {
            eps: financials?.eps || null,
            bps: financials?.bps || null,
            roe: financials?.roe || null,
            revenue: financials?.revenue || null,
            net_profit: financials?.net_profit || null,
            latest_period: financials?.latest_period || null
          },
          valuation: {
            pe_ratio: valuation.result_json?.pe_ratio || null,
            pb_ratio: valuation.result_json?.pb_ratio || null,
            pe_implied_price: valuation.pe_implied_price,
            pb_implied_price: valuation.pb_implied_price
          },
          analysis: {
            pe_analysis: getPEAnalysis(valuation.result_json?.pe_ratio),
            pb_analysis: getPBAnalysis(valuation.result_json?.pb_ratio),
            overall_assessment: getOverallAssessment(valuation.result_json?.pe_ratio, valuation.result_json?.pb_ratio)
          },
          created_at: valuation.created_at
        };
        
        return reply.send(response);
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      fastify.log.error('Valuation API error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch valuation data'
      });
    }
  });
  
  // 获取估值历史
  fastify.get('/valuation/:ts_code/history', async (request: FastifyRequest<{ Params: { ts_code: string } }>, reply: FastifyReply) => {
    const { ts_code } = request.params;
    
    try {
      const client = await pool.connect();
      
      try {
        const query = `
          SELECT 
            as_of_date,
            method,
            pe_implied_price,
            pb_implied_price,
            result_json,
            created_at
          FROM valuations
          WHERE ts_code = $1
          ORDER BY as_of_date DESC, created_at DESC
          LIMIT 30
        `;
        
        const result = await client.query(query, [ts_code]);
        
        const history = result.rows.map(row => ({
          as_of_date: row.as_of_date,
          method: row.method,
          pe_ratio: row.result_json?.pe_ratio || null,
          pb_ratio: row.result_json?.pb_ratio || null,
          pe_implied_price: row.pe_implied_price,
          pb_implied_price: row.pb_implied_price,
          created_at: row.created_at
        }));
        
        return reply.send({
          ts_code,
          history,
          count: history.length
        });
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      fastify.log.error('Valuation history API error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch valuation history'
      });
    }
  });
}

// PE分析函数
function getPEAnalysis(peRatio: number | null): string {
  if (!peRatio) return '数据不足';
  
  if (peRatio < 10) return 'PE较低，可能被低估';
  if (peRatio < 15) return 'PE适中，估值合理';
  if (peRatio < 25) return 'PE偏高，需关注成长性';
  return 'PE过高，存在估值风险';
}

// PB分析函数
function getPBAnalysis(pbRatio: number | null): string {
  if (!pbRatio) return '数据不足';
  
  if (pbRatio < 1) return 'PB小于1，可能被严重低估';
  if (pbRatio < 2) return 'PB较低，估值合理';
  if (pbRatio < 4) return 'PB适中，需关注资产质量';
  return 'PB过高，存在估值风险';
}

// 综合评估函数
function getOverallAssessment(peRatio: number | null, pbRatio: number | null): string {
  if (!peRatio || !pbRatio) return '数据不足，无法评估';
  
  const peScore = peRatio < 15 ? 3 : peRatio < 25 ? 2 : 1;
  const pbScore = pbRatio < 2 ? 3 : pbRatio < 4 ? 2 : 1;
  const totalScore = peScore + pbScore;
  
  if (totalScore >= 5) return '估值合理，值得关注';
  if (totalScore >= 3) return '估值偏高，谨慎投资';
  return '估值过高，风险较大';
}
