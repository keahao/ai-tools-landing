# AI Tools Suite - 订阅系统设置指南

## 1. 创建 Supabase 项目

1. 访问 https://supabase.com 并登录
2. 点击 "New Project" 创建新项目
3. 填写项目名称和数据库密码
4. 选择最近的区域（推荐 Singapore）
5. 等待项目创建完成（约2分钟）

## 2. 创建数据表

在 Supabase Dashboard 中，进入 SQL Editor，执行以下 SQL：

```sql
-- 用户表
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  plan VARCHAR(20) DEFAULT 'free',
  subscription_id VARCHAR(100),
  subscription_end TIMESTAMP,
  paypal_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 使用日志表
CREATE TABLE usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tool VARCHAR(50),
  action VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription ON users(subscription_id);
CREATE INDEX idx_usage_user ON usage_logs(user_id);
```

## 3. 获取 API Keys

在 Supabase Dashboard 中：
1. 进入 Settings > API
2. 复制以下值：
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_KEY`（注意：这是秘密密钥）

## 4. 配置 Vercel 环境变量

在 Vercel Dashboard 中：
1. 进入项目 Settings > Environment Variables
2. 添加以下变量：

| 变量名 | 值 |
|--------|-----|
| SUPABASE_URL | https://xxx.supabase.co |
| SUPABASE_SERVICE_KEY | eyJhbGciOi... |
| JWT_SECRET | 随机字符串（如：ai-tools-jwt-secret-2026） |
| PAYPAL_CLIENT_ID | AcwlL1zVZtCS4EUKLXxK8jfphMnFplDJvokbxR2PjPZI_P1jOgB0tI9sZSwpT8hJO4VUxz_ZIv_Z0Duu |
| PAYPAL_CLIENT_SECRET | EG4Wo9t2heJIuxrOnUX7Lxe0CdK0qGwE072A7XgoRMtbV68dsH0I9HKCLwO3DQgKXkrnWD0wfzw7bhAh |
| PAYPAL_PLAN_MONTHLY | （创建计划后获取） |
| PAYPAL_PLAN_YEARLY | （创建计划后获取） |

## 5. 创建 PayPal 订阅计划

部署后，访问以下 URL 创建订阅计划：
```
POST https://ai-tools-hub.vercel.app/api/paypal/create-plan
```

响应会返回 `monthly` 和 `yearly` 的 Plan ID，将它们添加到 Vercel 环境变量。

## 6. 配置 PayPal Webhook

1. 登录 https://developer.paypal.com/dashboard/
2. 进入 My Apps & Credentials > 你的应用 > Webhooks
3. 添加 Webhook URL：`https://ai-tools-hub.vercel.app/api/paypal/webhook`
4. 选择以下事件：
   - BILLING.SUBSCRIPTION.ACTIVATED
   - BILLING.SUBSCRIPTION.CANCELLED
   - BILLING.SUBSCRIPTION.EXPIRED
   - PAYMENT.SALE.COMPLETED
   - PAYMENT.SALE.DENIED

## 7. 更新 buy.html 中的 Plan ID

将获取到的 Plan ID 更新到 `buy.html` 中的 `PLANS` 变量：
```javascript
const PLANS = {
    monthly: 'P-xxxxx',  // 替换为实际的 Plan ID
    yearly: 'P-xxxxx'   // 替换为实际的 Plan ID
};
```

## 部署命令

```bash
cd /root/.openclaw/workspace/ai-tools-landing
npm install
vercel --prod
```

## 测试流程

1. 访问 https://ai-tools-hub.vercel.app/dashboard.html
2. 注册一个测试账号
3. 访问 buy.html 进行订阅测试
4. 在 Supabase Dashboard 查看用户数据变化
