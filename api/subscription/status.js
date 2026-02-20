// 订阅状态 API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'ai-tools-secret-key-2026';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 验证 Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // 获取用户信息
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, plan, subscription_id, subscription_end, paypal_email, created_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取使用量统计
    const { count: usageCount } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    res.json({
      success: true,
      subscription: {
        plan: user.plan,
        subscription_id: user.subscription_id,
        subscription_end: user.subscription_end,
        paypal_email: user.paypal_email,
        is_active: user.plan !== 'free' && (!user.subscription_end || new Date(user.subscription_end) > new Date())
      },
      usage: {
        total: usageCount || 0,
        limit: user.plan === 'free' ? 5 : null // 免费用户每日5次
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('获取订阅状态错误:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token无效' });
    }
    res.status(500).json({ error: '服务器错误' });
  }
}
