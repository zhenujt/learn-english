import { useEffect, useRef, useState, type FormEvent } from "react";
import { LogIn, LogOut, Mail, UserRound, X } from "lucide-react";
import { auth, type AuthMode } from "./auth-client";

const titles: Record<AuthMode, string> = {
  login: "登录账号",
  signup: "创建账号",
  forgot: "找回密码",
  reset: "设置新密码",
};

const descriptions: Record<AuthMode, string> = {
  login: "登录后学习记录会在所有设备和页面之间同步。",
  signup: "注册后可在句练和文档站共用同一个账号。",
  forgot: "输入注册邮箱，我们会发送密码重置链接。",
  reset: "请输入新的账号密码。",
};

/** Email and password sign-in dialog shared by every app in this repository. */
export function AuthDialog({
  open,
  email,
  initialMode = "login",
  onClose,
  onSignedIn,
  onSignedOut,
}: {
  open: boolean;
  email?: string;
  initialMode?: AuthMode;
  onClose: () => void;
  onSignedIn?: () => void;
  onSignedOut?: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [formEmail, setFormEmail] = useState(email ?? "");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setMessage("");
    setError("");
    setPassword("");
    window.requestAnimationFrame(() => emailRef.current?.focus());
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setPending(true);
    try {
      if (mode === "forgot") {
        await auth.sendPasswordReset(formEmail);
        setMessage("重置密码邮件已发送，请检查邮箱。");
      } else if (mode === "reset") {
        await auth.updatePassword(password);
        setMessage("密码已更新。");
      } else if (mode === "signup") {
        await auth.signUp(formEmail, password);
        setMessage("注册成功，请检查邮箱完成验证。");
      } else {
        await auth.signIn(formEmail, password);
        onSignedIn?.();
        onClose();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败，请重试。");
    } finally {
      setPending(false);
    }
  };

  const signOut = async () => {
    setError("");
    try {
      await auth.signOut();
      onSignedOut?.();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "退出登录失败。");
    }
  };

  return (
    <div className="auth-dialog-scrim" role="presentation" onClick={onClose}>
      <div
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="auth-dialog-close" type="button" onClick={onClose} aria-label="关闭">
          <X size={18} />
        </button>
        <p className="auth-dialog-eyebrow">云端同步</p>
        <h2 id="auth-dialog-title">{titles[mode]}</h2>
        <p className="auth-dialog-description">{descriptions[mode]}</p>

        {email && (
          <p className="auth-dialog-current">
            当前登录：<strong>{email}</strong>
          </p>
        )}

        {auth.configured ? (
          <>
            <form className="auth-dialog-form" onSubmit={submit}>
              {mode !== "reset" && (
                <label>
                  邮箱
                  <input
                    ref={emailRef}
                    type="email"
                    autoComplete="email"
                    value={formEmail}
                    onChange={(event) => setFormEmail(event.target.value)}
                    required
                    placeholder="you@example.com"
                  />
                </label>
              )}
              {mode !== "forgot" && (
                <label>
                  密码
                  <input
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    required
                    placeholder="至少 6 位"
                  />
                </label>
              )}
              <button className="auth-dialog-submit" type="submit" disabled={pending}>
                {pending ? (
                  "处理中…"
                ) : mode === "login" ? (
                  <>
                    <LogIn size={17} /> 登录
                  </>
                ) : mode === "signup" ? (
                  <>
                    <UserRound size={17} /> 注册
                  </>
                ) : mode === "reset" ? (
                  <>
                    <UserRound size={17} /> 更新密码
                  </>
                ) : (
                  <>
                    <Mail size={17} /> 发送重置邮件
                  </>
                )}
              </button>
            </form>

            <div className="auth-dialog-links">
              {mode === "login" && (
                <>
                  <button type="button" onClick={() => setMode("forgot")}>
                    忘记密码？
                  </button>
                  <button type="button" onClick={() => setMode("signup")}>
                    创建新账号
                  </button>
                </>
              )}
              {mode !== "login" && (
                <button type="button" onClick={() => setMode("login")}>
                  返回登录
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="auth-dialog-note">
            管理员还没有配置 Supabase，网站目前仍可直接使用本地学习模式。
          </p>
        )}

        {message && <p className="auth-dialog-message">{message}</p>}
        {error && <p className="auth-dialog-error">{error}</p>}

        {email && (
          <button className="auth-dialog-signout" type="button" onClick={() => void signOut()}>
            <LogOut size={16} /> 退出登录
          </button>
        )}
      </div>
    </div>
  );
}
