'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Camera, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AvatarCropper from './avatar-cropper';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const { user, updateProfile, changePassword, refreshUser } = useAuth();
  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Avatar cropping
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: '请选择图片文件' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: '图片不能超过5MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleCropped = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.png');

      // Get token from localStorage for Authorization header
      const token = localStorage.getItem('schedule_auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });
      const json = await res.json();
      if (json.error) {
        setMessage({ type: 'error', text: json.error });
        return;
      }
      await refreshUser();
      setMessage({ type: 'success', text: '头像更新成功' });
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage({ type: 'error', text: '上传失败' });
    }
  };

  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      setMessage({ type: 'error', text: '昵称不能为空' });
      return;
    }
    if (nickname.trim().length > 20) {
      setMessage({ type: 'error', text: '昵称不能超过20个字' });
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await updateProfile({ nickname: nickname.trim() });
    setSaving(false);
    if (result.success) {
      setMessage({ type: 'success', text: '昵称更新成功' });
      setTimeout(() => setMessage(null), 2000);
    } else {
      setMessage({ type: 'error', text: result.error || '更新失败' });
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword) {
      setMessage({ type: 'error', text: '请输入原密码' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码至少6位' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: '两次密码输入不一致' });
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await changePassword(oldPassword, newPassword);
    setSaving(false);
    if (result.success) {
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setMessage({ type: 'success', text: '密码修改成功' });
      setTimeout(() => setMessage(null), 2000);
    } else {
      setMessage({ type: 'error', text: result.error || '修改失败' });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setMessage(null); } }}>
        <DialogContent className="bg-card border-border/80 text-foreground max-w-md rounded shadow-2xl shadow-black/40">
          <DialogHeader>
            <DialogTitle className="text-foreground">个人设置</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1 mb-4">
            <button
              onClick={() => { setTab('profile'); setMessage(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${tab === 'profile' ? 'bg-zinc-700 text-foreground' : 'text-muted-foreground hover:text-muted-foreground'}`}
            >
              资料编辑
            </button>
            <button
              onClick={() => { setTab('password'); setMessage(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${tab === 'password' ? 'bg-zinc-700 text-foreground' : 'text-muted-foreground hover:text-muted-foreground'}`}
            >
              修改密码
            </button>
          </div>

          {tab === 'profile' ? (
            <div className="space-y-5">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border/60 bg-muted">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-violet-500/20">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleAvatarClick}
                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Phone (readonly) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">手机号</label>
                <div className="px-3 py-2.5 bg-muted/30 border border-border/60 rounded-lg text-muted-foreground text-sm">
                  {user?.phone || '-'}
                </div>
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">昵称</label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                  className="bg-muted/50 border-border/60 text-foreground placeholder:text-zinc-600 focus-visible:ring-blue-500/30 focus-visible:border-blue-500/50 h-10"
                />
                <p className="text-[10px] text-zinc-600 mt-1 text-right">{nickname.length}/20</p>
              </div>

              {message && (
                <div className={`text-sm rounded-lg px-3 py-2 ${message.type === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
                  {message.text}
                </div>
              )}

              <Button onClick={handleSaveNickname} disabled={saving}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 rounded-lg">
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />保存中...</> : '保存昵称'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">原密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <Input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="请输入原密码"
                    className="pl-10 pr-10 bg-muted/50 border-border/60 text-foreground placeholder:text-zinc-600 focus-visible:ring-blue-500/30 focus-visible:border-blue-500/50 h-10"
                  />
                  <button type="button" onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-muted-foreground">
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">新密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="请输入新密码（至少6位）"
                    className="pl-10 pr-10 bg-muted/50 border-border/60 text-foreground placeholder:text-zinc-600 focus-visible:ring-blue-500/30 focus-visible:border-blue-500/50 h-10"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-muted-foreground">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">确认新密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <Input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="请再次输入新密码"
                    className="pl-10 bg-muted/50 border-border/60 text-foreground placeholder:text-zinc-600 focus-visible:ring-blue-500/30 focus-visible:border-blue-500/50 h-10"
                  />
                </div>
              </div>

              {message && (
                <div className={`text-sm rounded-lg px-3 py-2 ${message.type === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
                  {message.text}
                </div>
              )}

              <Button onClick={handleChangePassword} disabled={saving}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 rounded-lg">
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />修改中...</> : '修改密码'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AvatarCropper
        open={cropOpen}
        imageSrc={cropImageSrc}
        onClose={() => setCropOpen(false)}
        onCropped={handleCropped}
      />
    </>
  );
}
