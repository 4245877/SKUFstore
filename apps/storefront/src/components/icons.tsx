import type { SVGProps } from 'react';

/*
 * Єдиний набір тонких line-іконок SKUFNYA.
 * Замінює емодзі, які рендеряться по-різному на кожній ОС
 * і ламають «кутюрну» maid-естетику.
 */

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ── Бренд ─────────────────────────────────── */

export function IconBow(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10.4 11.2C8.9 9.4 5.9 7.6 4.3 9.2c-1.6 1.6-.4 4.6 1.9 5 1.5.3 3.3-.6 4.4-1.5" />
      <path d="M13.6 11.2c1.5-1.8 4.5-3.6 6.1-2 1.6 1.6.4 4.6-1.9 5-1.5.3-3.3-.6-4.4-1.5" />
      <rect x="10.5" y="10.4" width="3" height="3" rx="0.9" />
      <path d="M10.8 13.4 9.3 18M13.2 13.4l1.5 4.6" />
    </IconBase>
  );
}

export function IconFlower(props: IconProps) {
  return (
    <IconBase {...props}>
      {[0, 72, 144, 216, 288].map((angle) => (
        <path
          key={angle}
          d="M12 3.6c1.3 1.4 2 2.8 2 4A2 2 0 0 1 12 9.6a2 2 0 0 1-2-2c0-1.2.7-2.6 2-4Z"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="1.4" />
    </IconBase>
  );
}

/* ── Переваги магазину ─────────────────────── */

export function IconShieldCheck(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.2 19 6v5c0 4.5-2.9 8-7 9.6C7.9 19 5 15.5 5 11V6l7-2.8Z" />
      <path d="m9 11.6 2.2 2.2L15 9.6" />
    </IconBase>
  );
}

export function IconBox(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.8 7.8 12 3.4l8.2 4.4v8.4L12 20.6l-8.2-4.4V7.8Z" />
      <path d="M3.8 7.8 12 12.2l8.2-4.4" />
      <path d="M12 12.2v8.4" />
    </IconBase>
  );
}

export function IconTruck(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.8 6.5h11.4v9.3H2.8z" />
      <path d="M14.2 9.6h3.4l2.6 3.1v3.1h-6" />
      <circle cx="6.6" cy="17.6" r="1.7" />
      <circle cx="16.9" cy="17.6" r="1.7" />
    </IconBase>
  );
}

export function IconChatHeart(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 4.8H4c-.8 0-1.5.7-1.5 1.5v8.4c0 .8.7 1.5 1.5 1.5h2.6v3.6l4.4-3.6H20c.8 0 1.5-.7 1.5-1.5V6.3c0-.8-.7-1.5-1.5-1.5Z" />
      <path d="M12 13.1s-2.7-1.8-2.7-3.5c0-.9.7-1.6 1.6-1.6.5 0 .9.2 1.1.6.2-.4.6-.6 1.1-.6.9 0 1.6.7 1.6 1.6 0 1.7-2.7 3.5-2.7 3.5Z" />
    </IconBase>
  );
}

/* ── Соцмережі та контакти ─────────────────── */

export function IconTelegram(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m21.3 4.4-17.6 7c-.8.3-.75 1.45.08 1.7l4.7 1.5 1.7 4.8c.3.8 1.35.9 1.8.2l2.15-3.2 4.4 3.2c.65.5 1.6.1 1.75-.7l2.55-13c.15-.85-.7-1.5-1.53-1.2Z" />
      <path d="m8.5 14.6 11.3-9" />
    </IconBase>
  );
}

export function IconViber(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.6c4.7 0 8.4 2.9 8.4 7s-3.7 7-8.4 7c-.7 0-1.5-.1-2.1-.2L6.2 20v-3c-1.7-1.3-2.6-3.2-2.6-5.4 0-4.1 3.7-7 8.4-7Z" />
      <path d="M9.7 8.2c.4-.4 1-.3 1.3.2l.5.9c.2.4.1.8-.2 1.1l-.3.3c.4.9 1.1 1.6 2 2l.3-.3c.3-.3.7-.4 1.1-.2l.9.5c.5.3.6.9.2 1.3-.5.5-1.3.7-2 .4-1.9-.7-3.4-2.2-4.1-4.1-.3-.7-.1-1.5.3-2.1Z" />
    </IconBase>
  );
}

export function IconInstagram(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.6" />
      <circle cx="12" cy="12" r="3.9" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function IconTiktok(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14.3 3.8c.3 2.2 1.9 3.9 4.1 4.2v2.9c-1.5 0-2.9-.5-4.1-1.3v5.6a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6 0 .9.1v3a2.5 2.5 0 1 0 1.6 2.3V3.8h2.9Z" />
    </IconBase>
  );
}

export function IconMail(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5.2" width="18" height="13.6" rx="1.8" />
      <path d="m3.6 6.4 8.4 6.4 8.4-6.4" />
    </IconBase>
  );
}

export function IconMailHeart(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5.2" width="18" height="13.6" rx="1.8" />
      <path d="m3.6 6.4 8.4 6 8.4-6" />
      <path
        d="M12 16.4s-2.1-1.4-2.1-2.7c0-.7.5-1.2 1.2-1.2.4 0 .7.2.9.5.2-.3.5-.5.9-.5.7 0 1.2.5 1.2 1.2 0 1.3-2.1 2.7-2.1 2.7Z"
        fill="currentColor"
        stroke="none"
      />
    </IconBase>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7.6 3.9c.6-.6 1.6-.5 2 .2l1.2 2c.3.5.2 1.2-.2 1.6l-1 1c.7 1.8 2.1 3.2 3.9 3.9l1-1c.4-.4 1.1-.5 1.6-.2l2 1.2c.7.4.8 1.4.2 2l-1 1c-.8.8-2 1.1-3.1.7-4-1.4-7.2-4.6-8.6-8.6-.4-1.1-.1-2.3.7-3.1l1.3-.7Z" />
    </IconBase>
  );
}

/* ── Магазин ───────────────────────────────── */

export function IconHeart({
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <IconBase {...props} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 19.4S4.2 14.5 4.2 9.5A3.8 3.8 0 0 1 8 5.7c1.6 0 3.1.9 4 2.2a4.8 4.8 0 0 1 4-2.2 3.8 3.8 0 0 1 3.8 3.8c0 5-7.8 9.9-7.8 9.9Z" />
    </IconBase>
  );
}

export function IconCart(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.5 3.5h2.4l2.5 12.4h9.8L19.8 8H6" />
      <circle cx="8.6" cy="19.4" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="19.4" r="1.3" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function IconBag(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5.6 8h12.8l1 12.4H4.6L5.6 8Z" />
      <path d="M8.8 10.4V7.2a3.2 3.2 0 0 1 6.4 0v3.2" />
    </IconBase>
  );
}

export function IconShare(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 10.8 13.2" />
      <path d="M17.5 13v5c0 .8-.7 1.5-1.5 1.5H6c-.8 0-1.5-.7-1.5-1.5V8c0-.8.7-1.5 1.5-1.5h5" />
    </IconBase>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 5h16l-6.2 7.2v5.6L10.2 20v-7.8L4 5Z" />
    </IconBase>
  );
}

/* ── Категорії колекцій ────────────────────── */

export function IconSword(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19.6 4.4 9.2 14.8" />
      <path d="M19.6 4.4 20 6.7M19.6 4.4l-2.3-.4" />
      <path d="m6.9 12.5 4.6 4.6" />
      <path d="m8.5 16.5-4 4" />
    </IconBase>
  );
}

export function IconLightning(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M13.2 2.6 4.8 13.4h6L9.6 21.4 19.2 9.8h-6l0-7.2Z" />
    </IconBase>
  );
}

export function IconCrown(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4.4 16.6-1.2-8.4 4.9 3.7 3.9-6.5 3.9 6.5 4.9-3.7-1.2 8.4H4.4Z" />
      <path d="M4.8 19.6h14.4" />
    </IconBase>
  );
}

export function IconWand(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.2 19.8 15.4 8.6" />
      <path d="M17.8 3.4v3M16.3 4.9h3" />
      <path d="M20 10.6v2.2M18.9 11.7h2.2" />
      <path d="M11.4 4.4v2M10.4 5.4h2" />
    </IconBase>
  );
}

/* ── Форми та інтерфейс ────────────────────── */

export function IconEye(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.8 12S6.2 5.9 12 5.9 21.2 12 21.2 12 17.8 18.1 12 18.1 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.7" />
    </IconBase>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4.2 4.2 15.6 15.6" />
      <path d="M10 5.2c.6-.1 1.3-.2 2-.2 5.8 0 9.2 7 9.2 7a16.6 16.6 0 0 1-3.2 4M6.5 6.7C4.1 8.5 2.8 12 2.8 12s3.4 6.1 9.2 6.1c1.3 0 2.5-.3 3.6-.8" />
      <path d="M10.1 10.3a2.7 2.7 0 0 0 3.7 3.7" />
    </IconBase>
  );
}

export function IconLock(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="10.4" width="14" height="10" rx="1.6" />
      <path d="M8.2 10.2V7.8a3.8 3.8 0 0 1 7.6 0v2.4" />
      <circle cx="12" cy="15.4" r="1.1" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4 21.2 19.8H2.8L12 4Z" />
      <path d="M12 10.2v4.2" />
      <circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 6.5h15" />
      <path d="M9 6.3V4.9c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3v1.4" />
      <path d="M6.3 6.7 7 19c0 .9.8 1.6 1.7 1.6h6.6c.9 0 1.6-.7 1.7-1.6l.7-12.3" />
      <path d="M10 10.5v6M14 10.5v6" />
    </IconBase>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="6.6" height="6.6" rx="1" />
      <rect x="13.4" y="4" width="6.6" height="6.6" rx="1" />
      <rect x="4" y="13.4" width="6.6" height="6.6" rx="1" />
      <rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1" />
    </IconBase>
  );
}

export function IconList(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.6" cy="6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="18" r="0.9" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/* ── Доставка, оплата, контент ─────────────── */

export function IconGlobe(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.4 12h17.2" />
      <path d="M12 3.4c2.4 2.3 3.7 5.3 3.7 8.6s-1.3 6.3-3.7 8.6c-2.4-2.3-3.7-5.3-3.7-8.6S9.6 5.7 12 3.4Z" />
    </IconBase>
  );
}

export function IconMap(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.6 6.2 9 4.2l6 2 5.4-2v13.6l-5.4 2-6-2-5.4 2V6.2Z" />
      <path d="M9 4.2v13.6M15 6.2v13.6" />
    </IconBase>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 4.8H6.8c-.9 0-1.6.7-1.6 1.6v12.6c0 .9.7 1.6 1.6 1.6h10.4c.9 0 1.6-.7 1.6-1.6V6.4c0-.9-.7-1.6-1.6-1.6H15" />
      <rect x="9" y="3" width="6" height="3.4" rx="1" />
      <path d="M8.8 11h6.4M8.8 14.2h6.4M8.8 17.4h4" />
    </IconBase>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4 20 .9-3.6L16.2 5.1a1.76 1.76 0 0 1 2.5 0l.2.2a1.76 1.76 0 0 1 0 2.5L7.6 19.1 4 20Z" />
      <path d="m14.8 6.5 2.7 2.7" />
    </IconBase>
  );
}

export function IconWrench(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </IconBase>
  );
}

export function IconPuzzle(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z" />
    </IconBase>
  );
}

export function IconMegaphone(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m3.4 10.8 17-4.7v11.8l-17-4.7v-2.4Z" />
      <path d="M11.2 16.4a2.8 2.8 0 1 1-5.4-1.5" />
    </IconBase>
  );
}

export function IconCard(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2" />
      <path d="M2.8 9.6h18.4" />
      <path d="M6.4 14.6h4" />
    </IconBase>
  );
}

export function IconReceipt(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 20.6V3.4h12v17.2l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3Z" />
      <path d="M9 8h6M9 11.4h6M9 14.8h3.6" />
    </IconBase>
  );
}
