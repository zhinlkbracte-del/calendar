# Schedule 日程管理应用 - 云服务器部署教程

> 本教程面向非技术人员，将手把手带你把项目部署到一台云服务器上，让任何人都能通过浏览器访问你的日程管理网站。

---

## 目录

1. [准备工作](#1-准备工作)
2. [购买与配置云服务器](#2-购买与配置云服务器)
3. [连接服务器](#3-连接服务器)
4. [安装基础环境](#4-安装基础环境)
5. [获取项目代码](#5-获取项目代码)
6. [配置 Supabase 数据库](#6-配置-supabase-数据库)
7. [配置环境变量](#7-配置环境变量)
8. [创建数据库表](#8-创建数据库表)
9. [构建与启动项目](#9-构建与启动项目)
10. [配置 Nginx 反向代理](#10-配置-nginx-反向代理)
11. [配置 HTTPS（可选但推荐）](#11-配置-https可选但推荐)
12. [设置开机自启动](#12-设置开机自启动)
13. [日常维护](#13-日常维护)
14. [常见问题排查](#14-常见问题排查)

---

## 1. 准备工作

在开始之前，你需要准备以下内容：

| 项目 | 说明 |
|------|------|
| 一台云服务器 | 推荐 2核4G 及以上配置，操作系统选 **Ubuntu 22.04 LTS** |
| 一个域名（可选） | 如 `schedule.yourcompany.com`，没有也可用服务器 IP 直接访问 |
| Supabase 账号 | 免费注册 [supabase.com](https://supabase.com)，用于数据库 |
| 项目代码 | 从开发者处获取项目源码压缩包或 Git 仓库地址 |

---

## 2. 购买与配置云服务器

### 2.1 购买服务器

推荐云服务商（任选其一）：
- 阿里云 ECS
- 腾讯云 CVM
- 华为云 ECS

选择配置：
- **CPU/内存**：2核4G（最低1核2G也能跑，但体验较差）
- **系统盘**：40G SSD 足够
- **操作系统**：Ubuntu 22.04 LTS
- **带宽**：1-5Mbps（根据用户量调整）

### 2.2 开放端口

在云服务商的「安全组」或「防火墙」设置中，开放以下端口：

| 端口 | 用途 |
|------|------|
| 22 | SSH 远程连接 |
| 80 | HTTP 网页访问 |
| 443 | HTTPS 网页访问 |

> ⚠️ **注意**：不要开放 5000 端口，我们会通过 Nginx 代理来访问，直接暴露应用端口不安全。

---

## 3. 连接服务器

### 3.1 Mac / Linux 用户

打开终端，输入：

```bash
ssh root@你的服务器IP
```

首次连接会提示确认指纹，输入 `yes` 回车，然后输入服务器密码。

### 3.2 Windows 用户

下载并安装 [PuTTY](https://www.putty.org/)，或使用 Windows Terminal 自带的 SSH：

```bash
ssh root@你的服务器IP
```

### 3.3 验证连接成功

连接后应看到类似提示符：

```
root@iZ2zeXXXXX:~#
```

---

## 4. 安装基础环境

连接到服务器后，依次执行以下命令。

### 4.1 更新系统

```bash
apt update && apt upgrade -y
```

> ⚠️ 如果提示 "restart services during upgrades"，选 `<Yes>` 回车即可。

### 4.2 安装 Node.js 24

```bash
# 安装 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -

# 安装 Node.js（包含 npm）
apt install -y nodejs

# 验证版本
node -v    # 应显示 v24.x.x
npm -v     # 应显示 10.x.x
```

### 4.3 安装 pnpm 包管理器

```bash
# 全局安装 pnpm
npm install -g pnpm@9

# 验证
pnpm -v    # 应显示 9.x.x
```

### 4.4 安装 Git

```bash
apt install -y git

# 验证
git --version
```

### 4.5 安装 Nginx（后面配置反向代理用）

```bash
apt install -y nginx

# 验证
nginx -v
```

---

## 5. 获取项目代码

### 方式一：从 Git 仓库克隆（推荐）

如果你有 Git 仓库地址：

```bash
# 创建项目目录
mkdir -p /opt/schedule

# 克隆代码
git clone https://你的仓库地址.git /opt/schedule

# 进入项目目录
cd /opt/schedule
```

### 方式二：上传代码压缩包

如果你收到的是一个 `.tar.gz` 压缩包：

```bash
# 1. 在你的本地电脑上，用 scp 上传
#    在本地终端执行（不是服务器上）：
scp schedule-project.tar.gz root@你的服务器IP:/opt/

# 2. 在服务器上解压
cd /opt
mkdir -p schedule
tar -xzf schedule-project.tar.gz -C schedule

# 3. 进入项目目录
cd /opt/schedule
```

### 验证项目文件

```bash
ls /opt/schedule/
```

应该能看到以下关键文件/目录：
```
package.json    src/    scripts/    next.config.ts    .coze
```

---

## 6. 配置 Supabase 数据库

### 6.1 注册 Supabase

1. 打开 [https://supabase.com](https://supabase.com)
2. 点击 "Start your project" 注册账号（支持 GitHub 登录）
3. 点击 "New Project" 创建新项目

### 6.2 创建项目

填写以下信息：

| 字段 | 填写内容 | 示例 |
|------|---------|------|
| Name | 项目名称 | my-schedule |
| Database Password | 数据库密码 | 自己设定一个强密码，**务必记住** |
| Region | 服务器区域 | 选择离你最近的，如 Northeast Asia (Tokyo) |
| Plan | 计划 | Free（免费版足够使用） |

点击 "Create new project"，等待约 2 分钟初始化。

### 6.3 获取连接密钥

项目创建完成后：

1. 在左侧菜单点击 **Settings**（齿轮图标）
2. 点击 **API**
3. 找到并记录以下三个值：

```
Project URL       →  https://xxxxx.supabase.co
anon public       →  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key  →  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（更长的那个）
```

> ⚠️ **安全提醒**：`service_role key` 拥有完全数据库权限，**绝不能暴露到前端代码或公开场合**。

### 6.4 关闭 RLS（行级安全策略）

本项目采用后端控制数据隔离的方式，需要在 Supabase 中关闭表的 RLS：

1. 在左侧菜单点击 **Table Editor**
2. 对于后续创建的每张表（`events`、`users`、`tasks`、`date_settings`），点击表名
3. 点击右上角 **RLS** 标签
4. 确保 RLS 状态为 **Disabled**（关闭）

> 如果 RLS 是开启的，API 请求可能会被拒绝。

---

## 7. 配置环境变量

### 7.1 创建环境变量文件

在项目根目录创建 `.env` 文件：

```bash
cd /opt/schedule
cat > .env << 'EOF'
# ===== Supabase 数据库配置 =====
COZE_SUPABASE_URL=https://你的项目ID.supabase.co
COZE_SUPABASE_ANON_KEY=你的anon_key
COZE_SUPABASE_SERVICE_ROLE_KEY=你的service_role_key

# ===== JWT 密钥 =====
# 生产环境务必更换为一个随机长字符串！
# 可用命令生成：openssl rand -hex 32
JWT_SECRET=请替换为一个32位以上的随机字符串

# ===== 对象存储配置（头像上传） =====
COZE_BUCKET_ENDPOINT_URL=你的S3端点URL
COZE_BUCKET_NAME=你的存储桶名称

# ===== 运行环境 =====
COZE_PROJECT_ENV=PROD
DEPLOY_RUN_PORT=5000
COZE_WORKSPACE_PATH=/opt/schedule
EOF
```

### 7.2 生成安全的 JWT 密钥

```bash
# 生成随机密钥
openssl rand -hex 32
```

将输出的字符串替换 `.env` 文件中 `JWT_SECRET=` 后面的内容。

### 7.3 关于对象存储

头像上传功能依赖 S3 兼容的对象存储服务。可选方案：

| 方案 | 说明 |
|------|------|
| 暂不配置 | 头像上传功能将不可用，其他功能正常 |
| 阿里云 OSS | 国内首选，创建 Bucket 后获取 Endpoint 和 Bucket Name |
| 腾讯云 COS | 类似阿里云 OSS |
| MinIO 自建 | 在服务器上自建对象存储，适合私有化部署 |

> 如果暂不配置对象存储，可以将 `COZE_BUCKET_ENDPOINT_URL` 和 `COZE_BUCKET_NAME` 留空，注册登录和日程管理功能不受影响，只是无法上传头像。

### 7.4 保护环境变量文件

```bash
# 确保 .env 文件只有 root 可读
chmod 600 /opt/schedule/.env
```

---

## 8. 创建数据库表

### 8.1 打开 Supabase SQL 编辑器

1. 登录 Supabase 控制台
2. 选择你的项目
3. 在左侧菜单点击 **SQL Editor**
4. 点击 **New query**

### 8.2 执行建表 SQL

将以下 SQL 复制到编辑器中，点击 **Run** 执行：

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(20) NOT NULL,
  avatar_key VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_phone_idx ON users (phone);

-- 事项表
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date VARCHAR(10) NOT NULL,
  category VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'not_started' NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' NOT NULL,
  sort_order VARCHAR(50) DEFAULT '0',
  task_id VARCHAR(36),
  user_id VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_date_idx ON events (date);
CREATE INDEX IF NOT EXISTS events_category_idx ON events (category);
CREATE INDEX IF NOT EXISTS events_status_idx ON events (status);
CREATE INDEX IF NOT EXISTS events_priority_idx ON events (priority);
CREATE INDEX IF NOT EXISTS events_user_id_idx ON events (user_id);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title VARCHAR(255) NOT NULL,
  start_date VARCHAR(10),
  planned_end_date VARCHAR(10),
  actual_end_date VARCHAR(10),
  urgency_type VARCHAR(20) DEFAULT 'important_urgent',
  latest_progress TEXT,
  status VARCHAR(20) DEFAULT 'not_started' NOT NULL,
  user_id VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks (user_id);

-- 日期设置表
CREATE TABLE IF NOT EXISTS date_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date VARCHAR(10) NOT NULL,
  day_type VARCHAR(10) DEFAULT 'workday' NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS date_settings_date_idx ON date_settings (date);
CREATE INDEX IF NOT EXISTS date_settings_user_id_idx ON date_settings (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS date_settings_date_user_unique ON date_settings (date, user_id);
```

> ⚠️ 如果执行时报错 "gen_random_uuid does not exist"，先执行以下命令启用扩展：
> ```sql
> CREATE EXTENSION IF NOT EXISTS pgcrypto;
> ```

### 8.3 验证建表成功

在左侧菜单点击 **Table Editor**，应该能看到 4 张表：`users`、`events`、`tasks`、`date_settings`。

---

## 9. 构建与启动项目

### 9.1 安装依赖

```bash
cd /opt/schedule
pnpm install
```

> ⚠️ 如果报错，尝试先清除缓存：`rm -rf node_modules && pnpm install`

### 9.2 构建项目

```bash
pnpm build
```

构建过程大约需要 1-3 分钟，看到 `Build completed successfully!` 即为成功。

### 9.3 测试启动

```bash
# 设置环境变量并启动
source /opt/schedule/.env
export $(cut -d= -f1 /opt/schedule/.env)
PORT=5000 node dist/server.js
```

看到以下输出说明启动成功：
```
> Server listening at http://localhost:5000 as PROD
```

按 `Ctrl+C` 停止测试启动。

### 9.4 常驻运行（使用 PM2）

PM2 是一个 Node.js 进程管理器，可以让应用在后台持续运行，崩溃自动重启。

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
cd /opt/schedule
pm2 start dist/server.js --name schedule -- --env .env

# 保存进程列表（开机恢复用）
pm2 save

# 设置开机自启
pm2 startup
```

> ⚠️ `pm2 startup` 会输出一条命令，**复制那条命令再执行一次**，才能真正开机自启。

### 9.5 验证 PM2 运行状态

```bash
pm2 status
```

应该看到：
```
┌────┬──────────┬─────────┬─────────┐
│ id │ name     │ status  │ cpu     │
├────┼──────────┼─────────┼─────────┤
│ 0  │ schedule │ online  │ 0%      │
└────┴──────────┴─────────┴─────────┘
```

如果 `status` 不是 `online`，查看日志排查：
```bash
pm2 logs schedule
```

---

## 10. 配置 Nginx 反向代理

Nginx 作为前置代理，将外部的 80/443 端口请求转发给内部 5000 端口的应用。

### 10.1 创建 Nginx 配置文件

```bash
cat > /etc/nginx/sites-available/schedule << 'EOF'
server {
    listen 80;
    server_name 你的域名或服务器IP;

    # 反向代理到 Node.js 应用
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 支持大文件上传（头像、Excel导入等）
        client_max_body_size 20m;
    }
}
EOF
```

将 `你的域名或服务器IP` 替换为实际值，例如：
- 有域名：`schedule.example.com`
- 无域名：`123.45.67.89`

### 10.2 启用配置

```bash
# 创建软链接启用站点
ln -sf /etc/nginx/sites-available/schedule /etc/nginx/sites-enabled/

# 删除默认站点（可选）
rm -f /etc/nginx/sites-enabled/default

# 测试配置是否正确
nginx -t
```

应看到：
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 10.3 重载 Nginx

```bash
systemctl reload nginx
```

### 10.4 验证访问

在浏览器中打开 `http://你的域名或IP`，应该能看到登录页面。

> ⚠️ 如果无法访问，检查云服务器安全组是否开放了 80 端口。

---

## 11. 配置 HTTPS（可选但推荐）

如果你有域名，强烈建议配置 HTTPS，确保数据传输安全。

### 11.1 安装 Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 11.2 申请免费 SSL 证书

```bash
certbot --nginx -d 你的域名
```

按提示操作：
1. 输入邮箱（用于证书过期提醒）
2. 同意服务条款（输入 `Y`）
3. 是否接收邮件（输入 `N`）
4. 选择是否重定向 HTTP 到 HTTPS（选 `2` 强制 HTTPS）

### 11.3 验证自动续期

```bash
certbot renew --dry-run
```

看到 "Congratulations" 即表示自动续期配置成功。

---

## 12. 设置开机自启动

### 12.1 PM2 开机自启（前面已设置）

```bash
# 确认 PM2 开机自启已生效
pm2 startup
# 如果提示 "command already setup"，说明已生效

# 保存当前进程列表
pm2 save
```

### 12.2 Nginx 开机自启

```bash
systemctl enable nginx
```

---

## 13. 日常维护

### 13.1 常用 PM2 命令

```bash
# 查看运行状态
pm2 status

# 查看实时日志
pm2 logs schedule

# 重启应用
pm2 restart schedule

# 停止应用
pm2 stop schedule

# 删除应用（需重新 start）
pm2 delete schedule
```

### 13.2 更新代码并重新部署

当开发者提供了新版本代码后：

```bash
cd /opt/schedule

# 如果使用 Git
git pull origin main

# 安装依赖
pnpm install

# 重新构建
pnpm build

# 重启应用
pm2 restart schedule
```

### 13.3 数据库变更

如果新版本有数据库表结构变更，开发者会提供 SQL 迁移脚本，在 Supabase 的 SQL Editor 中执行即可。

### 13.4 备份数据

Supabase 免费版会自动每日备份，付费版支持更频繁的备份。

手动导出备份：
1. 在 Supabase 控制台，进入 **Settings** → **Database**
2. 点击 **Backups** 查看备份记录
3. 也可通过 SQL Editor 使用 `COPY` 命令导出数据

---

## 14. 常见问题排查

### 问题：浏览器访问显示 "502 Bad Gateway"

**原因**：Node.js 应用未运行。

```bash
pm2 status          # 检查应用状态
pm2 logs schedule   # 查看错误日志
pm2 restart schedule # 尝试重启
```

### 问题：浏览器访问一直转圈加载

**原因**：可能是环境变量未正确加载。

```bash
# 检查 .env 文件是否存在
ls -la /opt/schedule/.env

# 检查 PM2 的环境变量
pm2 show schedule | grep -i env

# 重启并确保加载环境变量
pm2 delete schedule
cd /opt/schedule
pm2 start dist/server.js --name schedule
```

### 问题：注册/登录失败，提示 "Internal Server Error"

**原因**：Supabase 连接配置有误。

1. 检查 `.env` 中的 `COZE_SUPABASE_URL`、`COZE_SUPABASE_ANON_KEY`、`COZE_SUPABASE_SERVICE_ROLE_KEY` 是否正确
2. 检查数据库表是否已创建（在 Supabase Table Editor 中确认）
3. 检查 RLS 是否已关闭

### 问题：头像上传失败

**原因**：对象存储未配置或配置有误。

1. 检查 `.env` 中的 `COZE_BUCKET_ENDPOINT_URL` 和 `COZE_BUCKET_NAME`
2. 确认存储桶的访问权限为公开读

### 问题：服务器重启后网站打不开

**原因**：PM2 或 Nginx 未设置开机自启。

```bash
# 检查 Nginx
systemctl status nginx
systemctl enable nginx
systemctl start nginx

# 检查 PM2
pm2 status
pm2 resurrect     # 恢复保存的进程
```

### 问题：服务器磁盘空间不足

```bash
# 查看磁盘使用情况
df -h

# 清理系统日志
journalctl --vacuum-size=100M

# 清理 apt 缓存
apt clean

# 查看 PM2 日志大小
pm2 flush schedule    # 清空日志
```

---

## 环境变量速查表

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `COZE_SUPABASE_URL` | 是 | Supabase 项目 URL | `https://abc.supabase.co` |
| `COZE_SUPABASE_ANON_KEY` | 是 | Supabase 匿名密钥 | `eyJhbG...` |
| `COZE_SUPABASE_SERVICE_ROLE_KEY` | 是 | Supabase 服务端密钥 | `eyJhbG...` |
| `JWT_SECRET` | 是 | JWT 签名密钥 | `openssl rand -hex 32` 生成 |
| `COZE_BUCKET_ENDPOINT_URL` | 否 | S3 对象存储端点 | `https://oss-cn-beijing.aliyuncs.com` |
| `COZE_BUCKET_NAME` | 否 | 存储桶名称 | `my-schedule-avatars` |
| `COZE_PROJECT_ENV` | 是 | 运行环境 | `PROD` |
| `DEPLOY_RUN_PORT` | 是 | 应用端口 | `5000` |
| `COZE_WORKSPACE_PATH` | 是 | 项目目录 | `/opt/schedule` |

---

## 端口与服务关系图

```
用户浏览器
    │
    ▼
[Nginx :80/:443]  ←── 反向代理，处理 HTTPS
    │
    ▼
[Node.js :5000]   ←── Next.js 应用（PM2 管理）
    │
    ├──→ [Supabase 云数据库]   ←── 数据存储
    │
    └──→ [S3 对象存储]         ←── 头像文件存储
```

---

> 部署完成后，将访问地址（如 `https://schedule.example.com`）分享给团队成员，即可开始使用！
