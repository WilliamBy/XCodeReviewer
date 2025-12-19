/**
 * Login Page
 * Cyberpunk Terminal Aesthetic
 */

import { useState, FormEvent, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/context/AuthContext";
import { apiClient } from "@/shared/api/serverClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Lock, Mail } from "lucide-react";
import { version } from "../../package.json";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from, loading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await apiClient.post("/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (rememberMe) {
        localStorage.setItem("remembered_email", email);
      } else {
        localStorage.removeItem("remembered_email");
      }

      await login(response.data.access_token);
      toast.success("登录成功");
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        const messages = detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join('; ');
        toast.error(messages || "登录失败");
      } else if (typeof detail === 'object') {
        toast.error(detail.msg || detail.message || JSON.stringify(detail));
      } else {
        toast.error(detail || "登录失败，请检查邮箱和密码");
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
            智能安全审计平台
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-700 text-center">
              账号登录
            </h2>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked as boolean)
                    }
                    className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-medium text-slate-600 cursor-pointer"
                  >
                    记住我
                  </Label>
                </div>
                <a href="#" className="text-sm font-medium text-primary hover:text-primary/80">
                  忘记密码?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold bg-primary hover:bg-primary/90 text-white shadow-sm transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    验证中...
                  </span>
                ) : (
                  "登 录"
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                还没有账号？{" "}
                <span
                  className="text-primary font-semibold cursor-pointer hover:underline"
                  onClick={() => navigate("/register")}
                >
                  立即注册
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Version {version} · Secure Connection
          </p>
        </div>
      </div>
    </div>
  );
}
