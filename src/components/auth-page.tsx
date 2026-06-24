"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import {
  CalendarDays,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Smartphone,
  Loader2,
  Compass,
  Ruler,
  PenLine,
} from "lucide-react";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(phone, password);
      } else {
        await register(phone, password, nickname);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* ============ 背景层 ============ */}

      {/* 0. 暖色径向渐变底色 - 模拟阳光照射的纸面 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--work-color) 8%, transparent) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, color-mix(in srgb, var(--life-color) 6%, transparent) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, color-mix(in srgb, var(--primary) 3%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* 1. 大网格底纹 - 建筑师制图桌 */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.07]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="bigGrid"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </pattern>
          <pattern
            id="smallGrid"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 16 0 L 0 0 0 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.3"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bigGrid)" />
        <rect width="100%" height="100%" fill="url(#smallGrid)" />
      </svg>

      {/* 2. 巨型半透明数字 - 模拟巨型日历牌 */}
      <div className="absolute -right-12 top-1/2 -translate-y-1/2 pointer-events-none select-none">
        <div
          className="font-serif text-[28rem] leading-none text-foreground/[0.04]"
          style={{ fontFamily: "Lora, serif", fontWeight: 500 }}
        >
          30
        </div>
      </div>
      <div className="absolute -left-20 bottom-0 pointer-events-none select-none">
        <div
          className="font-serif text-[18rem] leading-none text-foreground/[0.035]"
          style={{ fontFamily: "Lora, serif", fontWeight: 500 }}
        >
          17
        </div>
      </div>

      {/* 3. 右侧大圆环 - 缓慢旋转 */}
      <div className="absolute -right-32 top-12 w-[480px] h-[480px] pointer-events-none">
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed border-foreground/15 animate-spin"
          style={{ animationDuration: "80s" }}
        />
        <div
          className="absolute inset-12 rounded-full border border-foreground/10 animate-spin"
          style={{ animationDuration: "50s", animationDirection: "reverse" }}
        />
        <div className="absolute inset-24 rounded-full border border-dashed border-foreground/10 animate-spin" style={{ animationDuration: "30s" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-foreground/30" />
        </div>
      </div>

      {/* 4. 左下方色块组合 - 拼接色卡 */}
      <div className="absolute left-8 bottom-8 flex flex-col gap-1 pointer-events-none">
        <div className="w-24 h-2 bg-[var(--work-color)] opacity-80" />
        <div className="w-16 h-2 bg-[var(--life-color)] opacity-80" />
        <div className="w-32 h-px bg-foreground/20 mt-1" />
        <div className="text-[9px] font-mono tracking-widest text-foreground/30 mt-1">
          PALETTE / 2025
        </div>
      </div>

      {/* 5. 右上角技术标注 */}
      <div className="absolute right-8 top-8 pointer-events-none text-right">
        <div className="flex items-center gap-2 justify-end text-[10px] font-mono tracking-[0.2em] text-foreground/40">
          <Compass className="h-3 w-3" />
          FIG.01 — SCHEDULE
        </div>
        <div className="text-[10px] font-mono tracking-[0.2em] text-foreground/30 mt-1">
          EDITION 2025 / REV.A
        </div>
      </div>

      {/* 6. 四角裁切标记 */}
      {[
        "top-4 left-4",
        "top-4 right-4",
        "bottom-4 left-4",
        "bottom-4 right-4",
      ].map((pos, i) => (
        <div key={i} className={`absolute ${pos} pointer-events-none`}>
          <div className="w-4 h-4 border-l border-t border-foreground/20" />
        </div>
      ))}

      {/* 7. 横向手账横线 - 在卡片上方 */}
      <div className="absolute top-0 left-0 right-0 h-full pointer-events-none overflow-hidden">
        <div className="flex flex-col gap-12 pt-32 opacity-[0.06]">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="border-t border-foreground/40 w-full"
            />
          ))}
        </div>
      </div>

      {/* 8. 飘浮的几何元素 - 带有色块 */}
      <div className="absolute top-1/4 left-12 pointer-events-none">
        <div className="w-12 h-12 border-2 border-[var(--work-color)] opacity-30 rotate-12" />
        <div className="w-1 h-20 bg-[var(--work-color)] opacity-30 ml-2 -mt-2" />
      </div>
      <div className="absolute bottom-1/3 right-24 pointer-events-none">
        <div
          className="w-16 h-16 rounded-full border-2 border-[var(--life-color)] opacity-25"
          style={{ animation: "float 7s ease-in-out infinite" }}
        />
      </div>
      <div
        className="absolute top-1/3 right-1/3 pointer-events-none"
        style={{ animation: "float 9s ease-in-out infinite 1s" }}
      >
        <div className="w-3 h-3 bg-[var(--work-color)] opacity-50 rotate-45" />
      </div>
      <div
        className="absolute top-2/3 left-1/4 pointer-events-none"
        style={{ animation: "float 8s ease-in-out infinite 0.5s" }}
      >
        <div className="w-1 h-32 bg-foreground/15" />
        <div className="w-32 h-1 bg-foreground/15 -mt-16 ml-1" />
      </div>

      {/* 9. 顶部水平信息条 */}
      <div className="absolute top-20 left-0 right-0 px-12 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 text-[10px] font-mono tracking-widest text-foreground/30">
          <Ruler className="h-3 w-3" />
          <span>SCALE 1:1</span>
          <span className="text-foreground/20">|</span>
          <span>SHEET 01/01</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-foreground/30">
          <div className="w-2 h-2 rounded-full bg-[var(--life-color)]" />
          <span>LIVE</span>
        </div>
      </div>

      {/* 10. 底部签名行 - 建筑图纸风格 */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="flex items-center gap-4 text-[10px] font-mono tracking-widest text-foreground/30">
          <div className="w-32 border-t border-foreground/20" />
          <PenLine className="h-3 w-3" />
          <span>SIGNED</span>
          <div className="w-32 border-t border-foreground/20" />
        </div>
      </div>

      {/* 11. 边缘虚线框 - 模拟打印边界 */}
      <div className="absolute inset-8 border border-dashed border-foreground/10 pointer-events-none" />

      {/* ============ 主体内容 ============ */}

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* 顶部品牌区 */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 border border-foreground/20 text-[10px] font-mono tracking-[0.3em] text-foreground/50">
              <CalendarDays className="h-3 w-3" />
              AGENDA · MMXXV
            </div>
            <h1
              className="text-6xl font-medium tracking-tight text-foreground mb-3"
              style={{ fontFamily: "Lora, serif" }}
            >
              日程本
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-8 h-px bg-foreground/30" />
              <span className="font-mono text-[10px] tracking-widest">
                SCHEDULE BOOK
              </span>
              <div className="w-8 h-px bg-foreground/30" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground/80 leading-relaxed">
              {mode === "login"
                ? "记录每一个重要的日子"
                : "创建账号，开启你的日程本"}
            </p>
          </div>

          {/* 卡片 */}
          <div className="relative">
            {/* 卡片外框装饰 */}
            <div className="absolute -top-2 -left-2 w-4 h-4 border-l border-t border-foreground/40" />
            <div className="absolute -top-2 -right-2 w-4 h-4 border-r border-t border-foreground/40" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 border-l border-b border-foreground/40" />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 border-r border-b border-foreground/40" />

            <div className="bg-card/90 backdrop-blur-sm border border-border p-8 shadow-sm">
              {/* 模式切换 tab */}
              <div className="flex border-b border-foreground/15 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className={`flex-1 pb-3 text-sm font-medium tracking-wide transition-all relative ${
                    mode === "login"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/70"
                  }`}
                >
                  登录
                  {mode === "login" && (
                    <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-foreground" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className={`flex-1 pb-3 text-sm font-medium tracking-wide transition-all relative ${
                    mode === "register"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/70"
                  }`}
                >
                  注册
                  {mode === "register" && (
                    <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-foreground" />
                  )}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "register" && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="nickname"
                      className="text-[10px] font-mono tracking-widest text-foreground/50 uppercase"
                    >
                      昵称 / Nickname
                    </Label>
                    <Input
                      id="nickname"
                      type="text"
                      placeholder="不超过 20 个字符"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={20}
                      required
                      disabled={submitting}
                      className="border-foreground/20 focus:border-foreground/50 bg-transparent"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label
                    htmlFor="phone"
                    className="text-[10px] font-mono tracking-widest text-foreground/50 uppercase"
                  >
                    手机号 / Mobile
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    pattern="1[3-9]\d{9}"
                    maxLength={11}
                    required
                    disabled={submitting}
                    className="border-foreground/20 focus:border-foreground/50 bg-transparent"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-[10px] font-mono tracking-widest text-foreground/50 uppercase"
                  >
                    密码 / Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                      disabled={submitting}
                      className="border-foreground/20 focus:border-foreground/50 bg-transparent pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="border-l-2 border-[var(--work-color)] bg-[var(--work-color)]/5 px-3 py-2 text-xs text-foreground/80">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-foreground text-background hover:bg-foreground/90 h-11 rounded-none font-medium tracking-wide"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "login" ? (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      登录
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      注册
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-foreground/10 flex items-center justify-center gap-2 text-[10px] font-mono tracking-widest text-foreground/40">
                <Smartphone className="h-3 w-3" />
                <span>MOBILE + PASSWORD</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-8 text-[10px] font-mono tracking-widest text-foreground/30">
            © 2025 AGENDA · CRAFTED WITH CARE
          </div>
        </div>
      </div>
    </div>
  );
}
