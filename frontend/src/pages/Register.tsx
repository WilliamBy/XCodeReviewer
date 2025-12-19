/**
 * Register Page
 * Cyberpunk Terminal Aesthetic
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/shared/api/serverClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Lock } from 'lucide-react';
import { version } from '../../package.json';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/auth/register', {
        email,
        password,
        full_name: fullName,
      });
      toast.success('注册成功，请登录');
      navigate('/login');
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        const messages = detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join('; ');
        toast.error(messages || '注册失败');
      } else if (typeof detail === 'object') {
        toast.error(detail.msg || detail.message || JSON.stringify(detail));
      } else {
        toast.error(detail || '注册失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-50 to-slate-50" />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md relative z-10 px-4">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-white border border-slate-200 rounded-xl shadow-sm mb-6">
            <img
              src="/logo_deepaudit.png"
              alt="DeepAudit"
              className="w-12 h-12 object-contain"
            />
          </div>
          <div className="text-3xl font-bold tracking-tight mb-2 text-slate-900">
            <span className="text-primary">Deep</span>
            <span>Audit</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            创建新账户
          </p>
        </div>

        {/* Register Form Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-700 text-center">
              注册账户
            </h2>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="space-y-2">
                <Label
                  htmlFor="fullName"
                  className="text-sm font-medium text-slate-700"
                >
                  姓名
                </Label>
                <div className="relative">
                  <Input
                    id="fullName"
                    placeholder="您的姓名"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-10 pl-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/20"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700"
                >
                  邮箱地址
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10 pl-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/20"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700"
                >
                  密码
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 pl-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/20"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold bg-primary hover:bg-primary/90 text-white shadow-sm transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    注册中...
                  </span>
                ) : (
                  "注 册"
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                已有账号？{" "}
                <span
                  className="text-primary font-semibold cursor-pointer hover:underline"
                  onClick={() => navigate('/login')}
                >
                  直接登录
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Version {version} · Secure Registration
          </p>
        </div>
      </div>
    </div>
  );
}
