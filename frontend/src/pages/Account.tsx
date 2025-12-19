/**
 * Account Page
 * Corporate Blue Theme
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Save,
  KeyRound,
  LogOut,
  UserPlus,
  GitBranch,
  Terminal
} from "lucide-react";
import { apiClient } from "@/shared/api/serverClient";
import { toast } from "sonner";
import type { Profile } from "@/shared/types";

export default function Account() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    github_username: "",
    gitlab_username: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/users/me');
      setProfile(res.data);
      setForm({
        full_name: res.data.full_name || "",
        phone: res.data.phone || "",
        github_username: res.data.github_username || "",
        gitlab_username: res.data.gitlab_username || "",
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error("加载账号信息失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await apiClient.put('/users/me', form);
      setProfile(res.data);
      toast.success("账号信息已更新");
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error("更新失败");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error("请填写新密码");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("两次输入的密码不一致");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error("密码长度至少6位");
      return;
    }

    try {
      setChangingPassword(true);
      await apiClient.put('/users/me', { password: passwordForm.new_password });
      toast.success("密码已更新");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error("密码更新失败");
    } finally {
      setChangingPassword(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "U";
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    toast.success("已退出登录");
    navigate('/login');
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto text-primary" />
          <p className="text-slate-500 font-sans text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen font-sans relative">

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-slate-800">用户信息</h3>
          </div>
          <div className="p-6 text-center">
            <div className="relative inline-block mb-4">
              <Avatar className="w-24 h-24 border-2 border-slate-100">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-blue-50 text-primary text-2xl font-bold">
                  {getInitials(profile?.full_name, profile?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-1">
              {profile?.full_name || "未设置姓名"}
            </h4>
            <p className="text-slate-500 text-sm">{profile?.email}</p>

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-violet-500" />
                <span className="text-slate-500">角色:</span>
                <span className="text-violet-600 font-medium">
                  {profile?.role === 'admin' ? '管理员' : '成员'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-sky-500" />
                <span className="text-slate-500">注册时间:</span>
                <span className="text-slate-700">{formatDate(profile?.created_at)}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
              <Button
                variant="outline"
                onClick={handleSwitchAccount}
                className="w-full h-10 border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                切换账号
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowLogoutDialog(true)}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 h-10 shadow-none"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-slate-800">基本信息</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                  <Mail className="w-3 h-3" /> 邮箱
                </Label>
                <Input
                  id="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
                />
                <p className="text-xs text-slate-400">邮箱不可修改</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                  <User className="w-3 h-3" /> 姓名
                </Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="请输入姓名"
                  className="border-slate-200 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                  <Phone className="w-3 h-3" /> 手机号
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="请输入手机号"
                  className="border-slate-200 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-slate-500" />
                代码托管账号
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="github" className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                    <GitBranch className="w-3 h-3" /> GitHub 用户名
                  </Label>
                  <Input
                    id="github"
                    value={form.github_username}
                    onChange={(e) => setForm({ ...form, github_username: e.target.value })}
                    placeholder="your-github-username"
                    className="border-slate-200 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gitlab" className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                    <GitBranch className="w-3 h-3" /> GitLab 用户名
                  </Label>
                  <Input
                    id="gitlab"
                    value={form.gitlab_username}
                    onChange={(e) => setForm({ ...form, gitlab_username: e.target.value })}
                    placeholder="your-gitlab-username"
                    className="border-slate-200 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 h-10 shadow-sm">
                {saving ? (
                  <>
                    <div className="loading-spinner w-4 h-4 mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存修改
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800">修改密码</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-xs font-semibold text-slate-500 uppercase">新密码</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  placeholder="输入新密码"
                  className="border-slate-200 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-xs font-semibold text-slate-500 uppercase">确认密码</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  placeholder="再次输入新密码"
                  className="border-slate-200 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  variant="outline"
                  className="h-10 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                >
                  {changingPassword ? (
                    <>
                      <div className="loading-spinner w-4 h-4 mr-2" />
                      更新中...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      更新密码
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-white border-slate-200 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-rose-500" />
              确认退出登录？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              退出后需要重新登录才能访问系统。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-slate-600 hover:bg-slate-50">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-sm"
            >
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
