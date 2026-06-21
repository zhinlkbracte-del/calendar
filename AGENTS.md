# Schedule - 日程管理应用

## 项目概览

一个基于月历的日程记录网站，支持登记每天的工作或生活事项，以月历形式呈现，可切换月份、弹窗填写事项，支持增删改。包含用户账号系统，数据按用户隔离。

### 核心功能
- 月历视图展示，支持切换月份和快速回到今天
- 点击日期弹窗创建新事项
- 点击已有事项弹窗编辑或删除
- 事项大类：工作(work)、生活(life)
- 事项状态：未开始(not_started)、进行中(in_progress)、已完成(completed)
- 优先级：紧急(urgent)、重要(important)、普通(normal)
- 工作日(周一-周五)和休息日(周六周日)视觉区分
- 深色主题，现代国际风格，响应式布局
- 用户账号系统：手机号+密码注册登录，数据按用户隔离
- 个人设置：编辑昵称、裁剪上传头像、修改密码

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **ORM/迁移**: Drizzle ORM
- **Auth**: bcryptjs + jsonwebtoken (自定义JWT认证)
- **Storage**: S3兼容对象存储 (coze-coding-dev-sdk)
- **日期处理**: date-fns

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/            # 认证 API
│   │   │   │   ├── register/route.ts  # POST(注册)
│   │   │   │   ├── login/route.ts     # POST(登录)
│   │   │   │   ├── me/route.ts        # GET(当前用户)
│   │   │   │   ├── profile/route.ts   # PUT(更新资料)
│   │   │   │   ├── change-password/route.ts # POST(修改密码)
│   │   │   │   └── avatar/route.ts    # POST(上传头像)
│   │   │   └── events/          # 事项 CRUD API
│   │   │       ├── route.ts     # GET(按月查询) + POST(创建)
│   │   │       ├── reorder/route.ts # POST(批量排序)
│   │   │       └── [id]/route.ts # PUT(更新) + DELETE(删除)
│   │   ├── globals.css          # 全局样式(深色主题+Inter字体)
│   │   ├── layout.tsx           # 根布局(dark class + AuthProvider)
│   │   └── page.tsx             # 月历主页(客户端组件)
│   ├── components/
│   │   ├── ui/                  # Shadcn UI 组件库
│   │   ├── auth-page.tsx        # 登录/注册页面
│   │   ├── profile-dialog.tsx   # 个人设置弹窗
│   │   └── avatar-cropper.tsx   # 头像裁剪组件
│   ├── lib/
│   │   ├── auth.ts              # JWT/bcrypt工具函数
│   │   ├── auth-context.tsx     # 认证上下文(AuthProvider)
│   │   ├── storage-client.ts    # S3存储客户端
│   │   ├── types.ts             # 事项类型定义与配置
│   │   └── utils.ts             # 通用工具函数
│   └── storage/database/
│       ├── shared/schema.ts     # Drizzle 表结构定义(events+users表)
│       └── supabase-client.ts   # Supabase 客户端初始化
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 数据库

### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID 主键 |
| phone | varchar(20) UNIQUE | 手机号 |
| password_hash | varchar(255) | bcrypt加密密码 |
| nickname | varchar(20) | 昵称 |
| avatar_key | text | 头像存储key(可选) |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### events 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID 主键 |
| title | varchar(255) | 事项标题 |
| description | text | 事项描述(可选) |
| date | varchar(10) | 日期 YYYY-MM-DD |
| category | varchar(20) | work / life |
| status | varchar(20) | not_started / in_progress / completed |
| priority | varchar(20) | urgent / important / normal (默认normal) |
| sort_order | varchar(50) | 同日排序顺序(可选) |
| user_id | varchar(36) | 所属用户ID(可选,兼容旧数据) |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

- RLS 策略：场景 A（公开读写，后端用service_role_key控制数据隔离）
- 索引：date, category, status, priority, user_id

## API 接口

### 认证相关
| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/auth/register | 注册(手机号+密码+昵称) |
| POST | /api/auth/login | 登录(手机号+密码) |
| GET | /api/auth/me | 获取当前用户信息 |
| PUT | /api/auth/profile | 更新昵称 |
| POST | /api/auth/change-password | 修改密码(需原密码) |
| POST | /api/auth/avatar | 上传/裁剪头像 |

### 事项相关
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/events?month=YYYY-MM | 查询指定月份所有事项(按用户过滤) |
| POST | /api/events | 创建新事项(自动关联用户) |
| PUT | /api/events/[id] | 更新指定事项(仅本人) |
| DELETE | /api/events/[id] | 删除指定事项(仅本人) |
| POST | /api/events/reorder | 批量更新排序 |

> 认证方式：HTTP-only Cookie (`token`)，JWT有效期7天

## 构建与测试命令

- 开发：`pnpm dev` (端口 5000)
- 构建：`pnpm build`
- 类型检查：`pnpm ts-check`
- Lint：`pnpm lint`
- 数据库迁移：`coze-coding-ai db upgrade`
- 数据库模型同步：`coze-coding-ai db generate-models`

## 开发规范

- 仅使用 pnpm 管理依赖
- TypeScript strict 模式，禁止隐式 any
- 字段命名 snake_case（Supabase 约束）
- 所有 Supabase 操作检查 { data, error }
- .delete() / .update() 必须带 filter
- 深色主题：HTML 根元素加 `dark` class
- 字体：Inter (Google Fonts CN)，通过 globals.css @import 引入
