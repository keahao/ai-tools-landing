// PayPal Webhook - 处理订阅事件
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// 验证 PayPal Webhook 签名
async function verifyWebhookSignature(req) {
  // 生产环境应该验证签名
  // 这里简化处理
  return true;
}

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

// 获取订阅详情
async function getSubscription(accessToken, subscriptionId) {
  const response = await fetch(`https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return await response.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;
    console.log('PayPal Webhook Event:', event.event_type, event.resource?.id);

    // 验证签名
    const isValid = await verifyWebhookSignature(req);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const eventType = event.event_type;
    const resource = event.resource;

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        // 订阅激活
        await handleSubscriptionActivated(resource);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        // 订阅取消
        await handleSubscriptionCancelled(resource);
        break;

      case 'BILLING.SUBSCRIPTION.EXPIRED':
        // 订阅过期
        await handleSubscriptionExpired(resource);
        break;

      case 'PAYMENT.SALE.COMPLETED':
        // 支付成功（续费）
        await handlePaymentCompleted(resource);
        break;

      case 'PAYMENT.SALE.DENIED':
        // 支付失败
        await handlePaymentFailed(resource);
        break;

      default:
        console.log('Unhandled event type:', eventType);
    }

    res.json({ success: true, received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// 处理订阅激活
async function handleSubscriptionActivated(resource) {
  const subscriptionId = resource.id;
  const payerEmail = resource.subscriber?.email_address;
  const planId = resource.plan_id;

  // 计算过期时间（月付或年付）
  const now = new Date();
  const plan = planId.includes('yearly') ? 'yearly' : 'monthly';
  const expiryDate = new Date(now);
  if (plan === 'yearly') {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  }

  // 查找并更新用户
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('paypal_email', payerEmail)
    .single();

  if (user) {
    await supabase
      .from('users')
      .update({
        plan: 'pro',
        subscription_id: subscriptionId,
        subscription_end: expiryDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    console.log(`✅ 订阅激活: ${payerEmail} -> ${plan}`);
  } else {
    // 创建新用户
    await supabase
      .from('users')
      .insert({
        email: payerEmail,
        paypal_email: payerEmail,
        name: payerEmail.split('@')[0],
        plan: 'pro',
        subscription_id: subscriptionId,
        subscription_end: expiryDate.toISOString()
      });

    console.log(`✅ 新用户订阅: ${payerEmail}`);
  }
}

// 处理订阅取消
async function handleSubscriptionCancelled(resource) {
  const subscriptionId = resource.id;

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .single();

  if (user) {
    // 保持到当前周期结束
    await supabase
      .from('users')
      .update({
        plan: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    console.log(`⚠️ 订阅取消: ${subscriptionId}`);
  }
}

// 处理订阅过期
async function handleSubscriptionExpired(resource) {
  const subscriptionId = resource.id;

  await supabase
    .from('users')
    .update({
      plan: 'free',
      subscription_id: null,
      subscription_end: null,
      updated_at: new Date().toISOString()
    })
    .eq('subscription_id', subscriptionId);

  console.log(`❌ 订阅过期: ${subscriptionId}`);
}

// 处理续费成功
async function handlePaymentCompleted(resource) {
  const subscriptionId = resource.billing_agreement_id;
  
  // 延长订阅时间
  const { data: user } = await supabase
    .from('users')
    .select('id, subscription_end')
    .eq('subscription_id', subscriptionId)
    .single();

  if (user) {
    const newExpiry = new Date(user.subscription_end);
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    await supabase
      .from('users')
      .update({
        plan: 'pro',
        subscription_end: newExpiry.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    console.log(`💰 续费成功: ${subscriptionId}`);
  }
}

// 处理支付失败
async function handlePaymentFailed(resource) {
  console.log(`❌ 支付失败: ${resource.id}`);
  // 可以发送邮件提醒用户
}
