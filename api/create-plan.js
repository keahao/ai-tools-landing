// PayPal 订阅计划创建脚本
// 运行此脚本创建订阅计划，获取 plan_id

const PAYPAL_CLIENT_ID = 'AcwlL1zVZtCS4EUKLXxK8jfphMnFplDJvokbxR2PjPZI_P1jOgB0tI9sZSwpT8hJO4VUxz_ZIv_Z0Duu';
const PAYPAL_CLIENT_SECRET = 'EG4Wo9t2heJIuxrOnUX7Lxe0CdK0qGwE072A7XgoRMtbV68dsH0I9HKCLwO3DQgKXkrnWD0wfzw7bhAh';

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

// 创建产品
async function createProduct(accessToken) {
  const response = await fetch('https://api-m.paypal.com/v1/catalogs/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'AI Tools Suite 专业版',
      description: 'AI报告生成、视频脚本、小说写作等9款AI工具专业版订阅',
      type: 'SERVICE',
      category: 'SOFTWARE',
      image_url: 'https://ai-tools-hub.vercel.app/logo.png',
      home_url: 'https://ai-tools-hub.vercel.app'
    })
  });
  
  return await response.json();
}

// 创建订阅计划
async function createPlan(accessToken, productId) {
  const response = await fetch('https://api-m.paypal.com/v1/billing/plans', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      name: '专业版月付',
      description: 'AI Tools Suite 专业版 - 月付订阅',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: '14.00',
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      },
      taxes: {
        percentage: '0',
        inclusive: false
      }
    })
  });
  
  return await response.json();
}

// 主函数
async function main() {
  console.log('🚀 开始创建 PayPal 订阅计划...\n');
  
  try {
    // 1. 获取 Access Token
    console.log('📡 获取 Access Token...');
    const accessToken = await getAccessToken();
    console.log('✅ Access Token 获取成功\n');
    
    // 2. 创建产品
    console.log('📦 创建产品...');
    const product = await createProduct(accessToken);
    console.log('✅ 产品创建成功:', product.id);
    console.log('   产品名称:', product.name, '\n');
    
    // 3. 创建订阅计划
    console.log('📋 创建订阅计划...');
    const plan = await createPlan(accessToken, product.id);
    console.log('✅ 订阅计划创建成功!');
    console.log('   Plan ID:', plan.id);
    console.log('   名称:', plan.name);
    console.log('   价格: $14.00/月\n');
    
    console.log('='.repeat(50));
    console.log('🎯 请将以下 Plan ID 复制到 buy.html 中:');
    console.log(`   PLAN_ID: ${plan.id}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.response) {
      console.error('详情:', await error.response.text());
    }
  }
}

main();
