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
  if (label === "Weak") return "var(--rc-rose)";
  if (label === "Medium") return "var(--rc-amber)";
  if (label === "Strong") return "var(--rc-teal)";
  return "var(--rc-text-faint)";
}

function getStrengthBarWidth(label: string) {
  if (label === "Weak") return "33%";
  if (label === "Medium") return "66%";
  if (label === "Strong") return "100%";
  return "0%";
}

export default function PasswordStrengthBlock({
  password,
  isVisible,
}: PasswordStrengthBlockProps) {
  if (!isVisible) return null;

  const strengthLabel = password ? checkStrength(password) : "Strength";
  const color = getStrengthColor(strengthLabel);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono" style={{ color: 'var(--rc-text-faint)' }}>
            Strength
          </span>
          <span className="text-xs font-mono font-medium" style={{ color }}>
            {strengthLabel}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--rc-elevated)' }}>
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{ width: getStrengthBarWidth(strengthLabel), background: color }}
          />
        </div>
      </div>

      <div className="rounded-lg p-3 mt-2" style={{ background: 'var(--rc-surface)', border: '1px solid var(--rc-border)' }}>
        <p className="text-xs font-mono mb-2" style={{ color: 'var(--rc-text-faint)' }}>
          Password must contain:
        </p>
        <ul className="text-xs font-mono space-y-1" style={{ color: 'var(--rc-text-muted)' }}>
          <li className="flex items-center gap-2">
            <span style={{ color: password.length >= 8 ? 'var(--rc-teal)' : 'var(--rc-text-faint)' }}>
              {password.length >= 8 ? "✓" : "○"}
            </span>
            At least 8 characters
          </li>
          <li className="flex items-center gap-2">
            <span style={{ color: /[A-Z]/.test(password) ? 'var(--rc-teal)' : 'var(--rc-text-faint)' }}>
              {/[A-Z]/.test(password) ? "✓" : "○"}
            </span>
            One uppercase letter
          </li>
          <li className="flex items-center gap-2">
            <span style={{ color: /[0-9]/.test(password) ? 'var(--rc-teal)' : 'var(--rc-text-faint)' }}>
              {/[0-9]/.test(password) ? "✓" : "○"}
            </span>
            One number
          </li>
          <li className="flex items-center gap-2">
            <span style={{ color: /[^A-Za-z0-9]/.test(password) ? 'var(--rc-teal)' : 'var(--rc-text-faint)' }}>
              {/[^A-Za-z0-9]/.test(password) ? "✓" : "○"}
            </span>
            One special character (!@#$%)
          </li>
        </ul>
      </div>
    </>
  );
}
