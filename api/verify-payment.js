// PayPal 支付验证 API (Vercel Serverless Function)
// 用于验证支付并激活用户订阅

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// 获取 Access Token
async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials'
  });
  
  const data = await response.json();
  return data.access_token;
}

// 验证订单
async function verifyOrder(accessToken, orderId) {
  const response = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });
  
  return await response.json();
}

// 验证订阅
async function verifySubscription(accessToken, subscriptionId) {
  const response = await fetch(`https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });
  
  return await response.json();
}

// Vercel Serverless Function
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { order_id, subscription_id, email } = req.query;
    
    if (!order_id && !subscription_id) {
      return res.status(400).json({ error: '缺少 order_id 或 subscription_id' });
    }
    
    const accessToken = await getAccessToken();
    
    let result;
    
    if (subscription_id) {
      // 验证订阅
      result = await verifySubscription(accessToken, subscription_id);
      
      if (result.status === 'ACTIVE') {
        // TODO: 激活用户订阅 (写入数据库)
        console.log(`✅ 订阅激活: ${subscription_id}, 邮箱: ${email}`);
        
        return res.json({
          success: true,
          type: 'subscription',
          subscription_id: subscription_id,
          status: result.status,
          plan_id: result.plan_id,
          subscriber: result.subscriber
        });
      } else {
        return res.json({
          success: false,
          error: '订阅状态异常',
          status: result.status
        });
      }
    } else {
      // 验证一次性订单
      result = await verifyOrder(accessToken, order_id);
      
      if (result.status === 'COMPLETED') {
        // TODO: 激活用户 (写入数据库)
        console.log(`✅ 订单验证成功: ${order_id}, 邮箱: ${email}`);
        
        return res.json({
          success: true,
          type: 'order',
          order_id: order_id,
          status: result.status,
          amount: result.purchase_units[0].amount,
          payer: result.payer
        });
      } else {
        return res.json({
          success: false,
          error: '订单未完成',
          status: result.status
        });
      }
    }
    
  } catch (error) {
    console.error('验证错误:', error);
    return res.status(500).json({ error: error.message });
  }
}
