import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import RoleSelector from './RoleSelector';
import InputField from './InputField';

export default function LoginForm({ onNavigateSignUp, onNavigateForgotPassword }) {
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const [submittedBanner, setSubmittedBanner] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email format validation
  const validateEmail = (value) => {
    if (!value.trim()) {
      return 'Email address is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) {
      return 'Invalid email format (e.g., student@college.edu.in)';
    }
    return '';
  };

  // Password validation
  const validatePassword = (value) => {
    if (!value) {
      return 'Password is required';
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: validateEmail(val) }));
    }
    if (submittedBanner) setSubmittedBanner(null);
  };

  const handleEmailBlur = () => {
    setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: validatePassword(val) }));
    }
    if (submittedBanner) setSubmittedBanner(null);
  };

  const handlePasswordBlur = () => {
    setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmittedBanner(null);

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    if (emailErr || passwordErr) {
      setErrors({
        email: emailErr,
        password: passwordErr,
      });
      return;
    }

    setErrors({ email: '', password: '' });
    setIsSubmitting(true);

    // Frontend demo validation simulation (NO fake session or storage)
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedBanner({
        type: 'info',
        roleLabel: role.charAt(0).toUpperCase() + role.slice(1),
        email: email.trim(),
        message:
          'Frontend validation passed! Notice: Real database authentication will connect in Phase 2 with DBMS integration. No credentials stored.',
      });
    }, 400);
  };

  const isFormEmpty = !email.trim() || !password;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3.5 sm:space-y-4" noValidate>
      {/* 1. Role Selection */}
      <RoleSelector
        selectedRole={role}
        onSelectRole={(newRole) => {
          setRole(newRole);
          if (submittedBanner) setSubmittedBanner(null);
        }}
      />

      {/* 2. College Email Input */}
      <InputField
        id="college-email"
        label="College Email"
        type="email"
        value={email}
        onChange={handleEmailChange}
        onBlur={handleEmailBlur}
        placeholder="yourname@college.edu.in"
        leftIcon={Mail}
        error={errors.email}
        autoComplete="email"
        required
      />

      {/* 3. Password Input */}
      <InputField
        id="password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={handlePasswordChange}
        onBlur={handlePasswordBlur}
        placeholder="Enter your password"
        leftIcon={Lock}
        error={errors.password}
        autoComplete="current-password"
        required
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-1 rounded-md text-[#252A27]/50 hover:text-[#245C45] focus:outline-none focus:ring-1 focus:ring-[#245C45] transition-colors cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        }
      />

      {/* 4. Remember Me & Forgot Password Row */}
      <div className="flex items-center justify-between text-xs pt-0.5">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none text-[#252A27]/85 font-medium">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded text-[#245C45] focus:ring-[#245C45] border-[#245C45]/30 cursor-pointer accent-[#245C45]"
          />
          <span>Remember me</span>
        </label>

        <button
          type="button"
          onClick={onNavigateForgotPassword}
          className="text-xs font-semibold text-[#245C45] hover:text-[#164B38] hover:underline focus:outline-none transition-colors cursor-pointer"
        >
          Forgot Password?
        </button>
      </div>

      {/* Demo Feedback Banner */}
      {submittedBanner && (
        <div className="p-3.5 rounded-xl bg-[#E6EFE7] border border-[#245C45]/25 text-left text-xs text-[#245C45] space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-1.5 font-semibold text-[#164B38]">
            <CheckCircle2 className="w-4 h-4 text-[#245C45]" />
            <span>Validated for {submittedBanner.roleLabel} Portal</span>
          </div>
          <p className="text-[11px] text-[#252A27]/80 leading-relaxed">
            {submittedBanner.message}
          </p>
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="w-full mt-1.5 py-2 px-3 bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <span>Proceed to Student Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Forest Green Login Button */}
      <button
        type="submit"
        disabled={isFormEmpty || isSubmitting}
        className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
          isFormEmpty || isSubmitting
            ? 'bg-[#245C45]/60 text-white/80 cursor-not-allowed'
            : 'bg-[#245C45] hover:bg-[#164B38] active:scale-[0.99] text-white hover:shadow-md cursor-pointer'
        }`}
      >
        <span>{isSubmitting ? 'Validating...' : 'Login'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* 6. "or" Divider */}
      <div className="relative py-0.5 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#245C45]/15" />
        </div>
        <div className="relative bg-white px-3 text-[11px] font-medium text-[#252A27]/50 uppercase tracking-wider">
          or
        </div>
      </div>

      {/* 7. Sign Up Link */}
      <div className="text-center text-xs text-[#252A27]/75">
        <span>Don't have an account? </span>
        <button
          type="button"
          onClick={onNavigateSignUp}
          className="font-semibold text-[#245C45] hover:text-[#164B38] hover:underline transition-colors cursor-pointer"
        >
          Sign Up
        </button>
      </div>

      {/* 8. Footer Note in Card */}
      <div className="pt-2 border-t border-[#245C45]/10 flex items-center justify-center gap-1.5 text-[11px] text-[#252A27]/60">
        <ShieldCheck className="w-3.5 h-3.5 text-[#245C45]" />
        <span>College DBMS Project · PlateWise Prototype</span>
      </div>
    </form>
  );
}
