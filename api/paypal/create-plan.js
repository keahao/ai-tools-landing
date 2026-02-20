// PayPal 订阅计划创建
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'AcwlL1zVZtCS4EUKLXxK8jfphMnFplDJvokbxR2PjPZI_P1jOgB0tI9sZSwpT8hJO4VUxz_ZIv_Z0Duu';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'EG4Wo9t2heJIuxrOnUX7Lxe0CdK0qGwE072A7XgoRMtbV68dsH0I9HKCLwO3DQgKXkrnWD0wfzw7bhAh';

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

async function createProduct(accessToken) {
  const response = await fetch('https://api-m.paypal.com/v1/catalogs/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'ai-tools-product-' + Date.now()
    },
    body: JSON.stringify({
      name: 'AI Tools Suite 专业版',
      description: 'AI报告生成、视频脚本、小说写作等9款AI工具专业版订阅',
      type: 'SERVICE',
      category: 'SOFTWARE',
      home_url: 'https://ai-tools-hub.vercel.app'
    })
  });
  return await response.json();
}

async function createPlan(accessToken, productId, interval, price, name) {
  const response = await fetch('https://api-m.paypal.com/v1/billing/plans', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'ai-tools-plan-' + interval + '-' + Date.now()
    },
    body: JSON.stringify({
      product_id: productId,
      name: name,
      description: `AI Tools Suite 专业版 - ${name}`,
      billing_cycles: [{
        frequency: {
          interval_unit: interval === 'monthly' ? 'MONTH' : 'YEAR',
          interval_count: 1
        },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: price,
            currency_code: 'USD'
          }
        }
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: '0', currency_code: 'USD' },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    })
  });
  return await response.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 开始创建 PayPal 订阅计划...');
    
    const accessToken = await getAccessToken();
    console.log('✅ Access Token 获取成功');

    // 创建产品
    const product = await createProduct(accessToken);
    console.log('✅ 产品创建成功:', product.id);

    // 创建月付计划
    const monthlyPlan = await createPlan(accessToken, product.id, 'monthly', '14.00', '月付');
    console.log('✅ 月付计划创建成功:', monthlyPlan.id);

    // 创建年付计划
    const yearlyPlan = await createPlan(accessToken, product.id, 'yearly', '140.00', '年付');
    console.log('✅ 年付计划创建成功:', yearlyPlan.id);

    res.json({
      success: true,
      product_id: product.id,
      plans: {
        monthly: monthlyPlan.id,
        yearly: yearlyPlan.id
      },
      message: '请将 Plan IDs 保存到环境变量 PAYPAL_PLAN_MONTHLY 和 PAYPAL_PLAN_YEARLY'
    });

  } catch (error) {
    console.error('创建计划失败:', error);
    res.status(500).json({ error: error.message });
  }
}
