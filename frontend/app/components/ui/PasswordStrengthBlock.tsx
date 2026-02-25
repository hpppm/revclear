import React from "react";

interface PasswordStrengthBlockProps {
  password: string;
  isVisible: boolean;
}

function checkStrength(pw: string) {
  let strength = 0;
  if (pw.length >= 8) strength++;
  if (/[A-Z]/.test(pw)) strength++;
  if (/[0-9]/.test(pw)) strength++;
  if (/[^A-Za-z0-9]/.test(pw)) strength++;

  if (strength <= 1) return "Weak";
  if (strength === 2) return "Medium";
  return "Strong";
}

function getStrengthColor(label: string) {
  if (label === "Weak") return "text-red-500";
  if (label === "Medium") return "text-yellow-500";
  return "text-green-500";
}

function getStrengthBarWidth(label: string) {
  if (label === "Weak") return "w-1/3";
  if (label === "Medium") return "w-2/3";
  return "w-full";
}

function getStrengthBarColor(label: string) {
  if (label === "Weak") return "bg-red-500";
  if (label === "Medium") return "bg-yellow-500";
  return "bg-green-500";
}

export default function PasswordStrengthBlock({
  password,
  isVisible,
}: PasswordStrengthBlockProps) {
  if (!isVisible) return null;

  const strengthLabel = password ? checkStrength(password) : "Strength";

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#9ca3af]">
            Strength bar
          </span>
          <span className={`text-xs font-medium ${getStrengthColor(strengthLabel)}`}>
            {strengthLabel}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getStrengthBarWidth(strengthLabel)} ${getStrengthBarColor(strengthLabel)} transition-all duration-300`}
          />
        </div>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 mt-2">
        <p className="text-xs text-[#9ca3af] font-medium mb-2">
          Password must contain:
        </p>
        <ul className="text-xs text-[#9ca3af] space-y-1">
          <li className="flex items-center gap-2">
            <span
              className={
                password.length >= 8 ? "text-[#C7A6E6]" : "text-gray-300"
              }
            >
              {password.length >= 8 ? "✓" : "○"}
            </span>
            At least 8 characters
          </li>
          <li className="flex items-center gap-2">
            <span
              className={
                /[A-Z]/.test(password) ? "text-[#C7A6E6]" : "text-gray-300"
              }
            >
              {/[A-Z]/.test(password) ? "✓" : "○"}
            </span>
            One uppercase letter
          </li>
          <li className="flex items-center gap-2">
            <span
              className={
                /[0-9]/.test(password) ? "text-[#C7A6E6]" : "text-gray-300"
              }
            >
              {/[0-9]/.test(password) ? "✓" : "○"}
            </span>
            One number
          </li>
          <li className="flex items-center gap-2">
            <span
              className={
                /[^A-Za-z0-9]/.test(password)
                  ? "text-[#C7A6E6]"
                  : "text-gray-300"
              }
            >
              {/[^A-Za-z0-9]/.test(password) ? "✓" : "○"}
            </span>
            One special character (!@#$%)
          </li>
        </ul>
      </div>
    </>
  );
}
