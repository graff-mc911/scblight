import { ReactNode } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import ViewOnlyBanner from './ViewOnlyBanner';
import PaywallCard from './PaywallCard';
import { Loading } from './Loading';

type Props = {
  children: ReactNode;
  showPaywall?: boolean;
};

export default function PremiumGate({ children, showPaywall = true }: Props) {
  const { loading, fullAccess } = useSubscription();

  if (loading) return <Loading />;

  if (fullAccess) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4">
      <ViewOnlyBanner />
      {showPaywall && <PaywallCard />}
      <div className="pointer-events-none opacity-60">{children}</div>
    </div>
  );
}
