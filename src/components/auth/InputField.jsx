import { AlertCircle } from 'lucide-react';

export default function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  leftIcon: LeftIcon,
  rightElement,
  error,
  autoComplete,
  required = false,
  disabled = false,
}) {
  const hasError = Boolean(error);

  return (
    <div className="w-full text-left">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-[#252A27] mb-1 tracking-wide"
        >
          {label}
          {required && <span className="text-[#E99A55] ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Left Icon */}
        {LeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#245C45]/70">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}

        {/* Text Input */}
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`w-full text-sm bg-white rounded-xl transition-all duration-200 outline-none text-[#252A27] placeholder:text-[#252A27]/40 ${
            LeftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightElement ? 'pr-11' : 'pr-3.5'} py-2.5 ${
            hasError
              ? 'border-2 border-red-400 bg-red-50/20 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-400/20'
              : 'border border-[#245C45]/20 hover:border-[#245C45]/40 focus:border-[#245C45] focus:ring-2 focus:ring-[#245C45]/20'
          }`}
        />

        {/* Right Element (e.g. Password Toggle) */}
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <div
          id={`${id}-error`}
          className="mt-1 flex items-center gap-1.5 text-xs text-red-600 font-medium"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
