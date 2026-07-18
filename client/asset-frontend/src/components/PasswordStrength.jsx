import React from 'react';

const PasswordStrength = ({ password = '' }) => {
  const getStrength = (pass) => {
    let score = 0;
    if (!pass) return { score, label: 'None', color: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-400' };

    // Evaluation points
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) {
      return { score, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-500', width: 'w-1/4' };
    } else if (score === 3) {
      return { score, label: 'Medium', color: 'bg-amber-500', text: 'text-amber-500', width: 'w-2/4' };
    } else if (score === 4) {
      return { score, label: 'Strong', color: 'bg-indigo-500', text: 'text-indigo-500', width: 'w-3/4' };
    } else {
      return { score, label: 'Very Strong', color: 'bg-emerald-500', text: 'text-emerald-500', width: 'w-full' };
    }
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2 w-full">
      <div className="flex justify-between items-center text-xs font-semibold mb-1">
        <span className="text-slate-500">Password Strength:</span>
        <span className={strength.text}>{strength.label}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-300 ${strength.color} ${strength.width}`} />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">
        Use 10+ characters, upper & lowercase, numbers & symbols for maximum security.
      </p>
    </div>
  );
};

export default PasswordStrength;
