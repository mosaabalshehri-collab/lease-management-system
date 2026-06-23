/** شعار النظام: درع بأسلوب رسمي مستوحى من هوية ناجز */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M24 3l16 6v11c0 10.5-6.8 19.6-16 22.5C14.8 39.6 8 30.5 8 20V9l16-6z"
        fill="var(--color-primary)"
      />
      <path
        d="M24 9.5l10 3.7v7.3c0 6.8-4.3 12.7-10 14.8-5.7-2.1-10-8-10-14.8v-7.3l10-3.7z"
        fill="var(--color-paper)"
        opacity="0.15"
      />
      <path
        d="M18 24l4.5 4.5L31 20"
        stroke="var(--color-gold)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
