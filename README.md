# Yonghong AI API POC

将 AI 问答能力嵌入永洪 BI 自定义绘图组件的最小可运行示例。

项目包含：

- 永洪自定义绘图组件，支持读取 `options.data` 或同源调用永洪 WebAPI；
- 本地 FastAPI 服务，保存模型密钥并提供异步任务接口；
- GPT Chat 兼容模型调用；
- 上游返回 HTTP 503 时自动等待并重新提交；
- SQLite 任务状态存储；
- 本地 HTTPS 证书生成与 Windows 启动脚本；
- 企业 CA、关闭证书校验和可选 mTLS 配置。

## 架构

```text
永洪自定义绘图
  ├─ options.data
  └─ /bi/api?action=...
          │
          ▼
https://127.0.0.1:8443/api/v1/jobs
          │
          ├─ SQLite 任务队列
          ├─ 数据裁剪与脱敏
          ├─ 业务背景与指标字典
          └─ GPT Chat 接口（503 自动重试）
```

永洪浏览器会话仅用于同源访问 `/bi/api`。组件不会读取或上传会话 Cookie，本地服务也不需要永洪账号。

## 目录

```text
app/                              FastAPI 服务
component/yonghong_ai_component.js 永洪自定义绘图组件
scripts/                          启动、证书和模拟模型
sql/                              参数化 SQL 示例
tests/                            单元测试
setup.cmd                         初始化环境
trust_dev_cert.cmd                信任本地开发证书
run.cmd                           启动 HTTPS 服务
```

## 环境要求

- Windows 10/11
- Python 3.10+，64 位
- 永洪自定义绘图组件
- GPT Chat 兼容模型接口

## 初始化

```powershell
.\setup.cmd
notepad .env
```

至少配置：

```dotenv
MODEL_BASE_URL=https://your-model-gateway.example.com/v1
MODEL_API_KEY=replace-with-real-key
MODEL_NAME=example-model
```

然后信任本地证书：

```powershell
.\trust_dev_cert.cmd
```

关闭并重新打开浏览器。

## 启动

```powershell
.\run.cmd
```

服务地址：

```text
https://127.0.0.1:8443
```

健康检查：

```powershell
curl.exe --noproxy "*" -vk https://127.0.0.1:8443/api/v1/health
```

本地测试页：

```text
https://127.0.0.1:8443/chat/
```

## 永洪组件

将以下文件完整粘贴到永洪自定义绘图脚本：

```text
component/yonghong_ai_component.js
```

永洪运行环境提供的是 `$container`，它是组件容器的 DOM ID。组件通过以下方式取得容器：

```javascript
var container = document.getElementById($container);
```

建议选择支持“完整代码”的自定义绘图库模式，不要使用只接受 ECharts `option` 对象的模式。

### 模式 A：`options.data`

组件默认按以下顺序映射绑定字段：

```text
column1  event_date
column2  event_id
column3  os_name
column4  sdk_pure_version
column5  total_count
column6  success_count
column7  failure_count
column8  failure_rate
column9  avg_total_time
```

该模式适合解释当前筛选后的图表数据，不需要配置永洪 WebAPI。

### 模式 B：永洪 WebAPI

组件以当前浏览器身份同源请求：

```javascript
fetch('/bi/api?action=' + encodeURIComponent(action), {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
  },
  body: new URLSearchParams({ xmlData }).toString()
})
```

需要在组件设置中填写当前永洪版本对应的：

- `action`
- `xmlData`
- JSON 数据行路径
- 模板参数

不同永洪版本和部署的 action、XML 格式可能不同，因此仓库不硬编码具体值。

## API

### 创建任务

```http
POST /api/v1/jobs
Content-Type: application/json
```

```json
{
  "question": "分析当前失败率。",
  "dashboard": "示例看板",
  "dataset_name": "event_summary",
  "filters": {
    "event_id": 10001,
    "os_name": "Android"
  },
  "rows": [
    {
      "event_date": "2026-01-01",
      "event_id": 10001,
      "os_name": "Android",
      "failure_rate": 0.05
    }
  ]
}
```

返回：

```json
{
  "job_id": "...",
  "status": "queued",
  "poll_interval_ms": 2000
}
```

### 查询任务

```http
GET /api/v1/jobs/{job_id}
```

可能状态：

```text
queued
preparing
calling_model
waiting_model
succeeded
failed
```

## 503 重试

```dotenv
MODEL_RETRY_STATUS_CODES=503
MODEL_RETRY_INTERVALS_SECONDS=15,20,30,45,60
MODEL_MAX_TOTAL_WAIT_SECONDS=300
```

上游返回 503 时，本地服务会更新任务为 `waiting_model`，等待后使用相同请求重新 POST。永洪组件只轮询本地任务状态。

## TLS 配置

### 默认：系统 CA

```dotenv
MODEL_VERIFY_SSL=true
MODEL_CA_BUNDLE=
MODEL_MTLS_ENABLED=false
```

### 企业 CA

```dotenv
MODEL_VERIFY_SSL=true
MODEL_CA_BUNDLE=certs/company-ca-bundle.pem
MODEL_MTLS_ENABLED=false
```

`MODEL_CA_BUNDLE` 可包含根 CA、中间 CA 或完整 PEM 链。不要把 CA 文件配置到 `MODEL_CLIENT_CERT_FILE`。

将 DER `.cer` 转为 PEM：

```powershell
.\.venv\Scripts\python.exe .\scripts\convert_ca_to_pem.py `
  .\certs\company-root.cer `
  .\certs\company-root.pem
```

### 仅用于 POC：关闭校验

```dotenv
MODEL_VERIFY_SSL=false
```

还兼容以下旧变量名称：

```dotenv
VERIFY=false
ENV_VERIFY=false
ENVVERIFY=false
envverify=false
```

### mTLS

仅在模型网关明确要求客户端证书时启用：

```dotenv
MODEL_MTLS_ENABLED=true
MODEL_CLIENT_CERT_FILE=certs/client-cert.pem
MODEL_CLIENT_KEY_FILE=certs/client-key.pem
MODEL_CLIENT_KEY_PASSWORD=
```

客户端证书和私钥必须同时配置。

## 本地模拟 503

终端一：

```powershell
.\.venv\Scripts\python.exe -m uvicorn scripts.mock_model:app --host 127.0.0.1 --port 9001
```

临时配置：

```dotenv
MODEL_BASE_URL=http://127.0.0.1:9001/v1
MODEL_API_KEY=mock-key
MODEL_NAME=example-model
MODEL_RETRY_INTERVALS_SECONDS=1,1,1,1
MODEL_MAX_TOTAL_WAIT_SECONDS=30
```

模拟服务前三次返回 503，第四次返回成功响应。

## 测试

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

## 安全说明

- 不要提交 `.env`、证书、私钥或 SQLite 数据库；
- 模型 API Key 只保存在本地服务；
- 永洪 Cookie 不应发送到本地 AI 服务；
- 正式环境建议使用企业 CA，不建议关闭 TLS 校验；
- 不建议让模型自由生成并执行任意 SQL，应使用参数化数据集或受控 SQL 模板；
- 当前 SQLite 队列适用于 POC 和小规模内部测试，多实例部署应替换为 Redis/Celery、RabbitMQ 或其他任务系统。
