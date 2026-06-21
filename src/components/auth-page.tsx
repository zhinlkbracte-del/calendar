'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { CalendarDays, Phone, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入有效的手机号');
      return;
    }

    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }

    if (isLogin) {
      setSubmitting(true);
      const result = await login(phone, password);
      setSubmitting(false);
      if (!result.success) setError(result.error || '登录失败');
    } else {
      if (!nickname.trim()) {
        setError('请输入昵称');
        return;
      }
      if (nickname.trim().length > 20) {
        setError('昵称不能超过20个字');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次密码输入不一致');
        return;
      }

      setSubmitting(true);
      const result = await register(phone, password, nickname.trim());
      setSubmitting(false);
      if (!result.success) setError(result.error || '注册失败');
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setNickname('');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded border border-border bg-card shadow-sm mb-3">
            <CalendarDays className="w-7 h-7 text-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">日程管理</h1>
          <p className="text-muted-foreground text-xs mt-1 tracking-wide">记录工作与生活</p>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-5 pb-3 border-b border-border">
            {isLogin ? '登录账号' : '注册新账号'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">手机号</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入手机号"
                  className="pl-10 h-10 text-sm bg-background border-border"
                />
              </div>
            </div>

            {/* Nickname */}
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">昵称</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                    placeholder="请输入昵称（最多20字）"
                    className="pl-10 h-10 text-sm bg-background border-border"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-1 text-right">{nickname.length}/20</p>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码（至少6位）"
                  className="pl-10 pr-10 h-10 text-sm bg-background border-border"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="pl-10 h-10 text-sm bg-background border-border"
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-red-500 dark:text-red-400 text-xs bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-10 bg-foreground text-background hover:bg-foreground/90 shadow-none rounded text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? '处理中...' : isLogin ? '登录' : '注册'}
            </Button>
          </form>

          {/* Switch mode */}
          <div className="mt-5 text-center text-xs text-muted-foreground">
            {isLogin ? (
              <>
                还没有账号？
                <button onClick={switchMode} className="text-foreground hover:text-foreground/80 ml-1 font-semibold transition-colors">
                  注册
                </button>
              </>
            ) : (
              <>
                已有账号？
                <button onClick={switchMode} className="text-foreground hover:text-foreground/80 ml-1 font-semibold transition-colors">
                  登录
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
