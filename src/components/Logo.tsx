/** شعار النظام: تأجير ثنائي الاتجاه — سهمان (نستأجر ↔ نؤجّر) داخل بلاطة بهوية النظام */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="11" fill="var(--color-primary)" />
      {/* السهم الصاعد — نؤجّر (مبالغ لنا) */}
      <path d="M19 33 L19 17" stroke="var(--color-gold)" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M14.6 21.4 L19 16.5 L23.4 21.4" stroke="var(--color-gold)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* السهم النازل — نستأجر (مبالغ علينا) */}
      <path d="M29 15 L29 31" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M24.6 26.6 L29 31.5 L33.4 26.6" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
