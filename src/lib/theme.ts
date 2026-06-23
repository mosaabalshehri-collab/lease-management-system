/**
 * سكربت يُحقن في <head> ويُنفَّذ قبل أول رسم للصفحة، عشان يطبّق الوضع
 * (داكن/فاتح) فوراً ويتفادى وميض الوضع الخاطئ (FOUC). يقرأ تفضيل
 * المستخدم من localStorage، وإلا يتبع تفضيل النظام.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored ? stored === 'dark' : prefersDark;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;
