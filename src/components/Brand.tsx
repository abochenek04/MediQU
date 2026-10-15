import { useApp } from '../context/AppContext';
import { Link } from '../utils/navigation';

export function LogoMark({ size = 38 }: { size?: number }) {
  return (
    <img
      src="/logo.svg"
      alt=""
      className="logo-mark"
      width={size * 2}
      height={size}
    />
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useApp();
  return (
    <Link className="brand" to="/find" aria-label={t('MediQ home')}>
      <LogoMark size={compact ? 34 : 40} />
      <span className="brand-word">MediQ</span>
    </Link>
  );
}
