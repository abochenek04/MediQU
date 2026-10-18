import { useApp } from '../context/AppContext';
import { Link } from '../utils/navigation';

export function LogoMark({ size = 38 }: { size?: number }) {
  return (
    <img
      src="/logo.svg?v=mq-1"
      alt=""
      className="logo-mark"
      width={size}
      height={size}
    />
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useApp();
  return (
    <Link className="brand" to="/find" aria-label={t('MediQU home')}>
      <LogoMark size={compact ? 34 : 40} />
      <span className="brand-word">MediQU<sup className="brand-trademark" aria-hidden="true">™</sup></span>
    </Link>
  );
}
