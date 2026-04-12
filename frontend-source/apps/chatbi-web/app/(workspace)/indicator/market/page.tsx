import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import IndicatorContractsPage from '../../indicator-contracts/page'

export default function IndicatorMarketPage() {
  return (
    <BiCanonicalShell
      activeTab="indicator-market"
      title="Indicator Market"
      description="Canonical indicator market route aligned with xpert menu semantics."
    >
      <BiCanonicalPanel
        testId="bi-indicator-market-home"
        title="Indicator Market"
        description="Indicator market now runs the live contracts register and compatibility overview."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/project/indicator" className="badge badge-ok">
            Open Project Register
          </Link>
          <Link href="/indicator-app" className="badge badge-warn">
            Open Indicator App
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-indicator-market-runtime">
        <IndicatorContractsPage />
      </section>
    </BiCanonicalShell>
  )
}
