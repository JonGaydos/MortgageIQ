import Card from '../components/ui/Card';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-ink mb-6">Dashboard</h1>

      <Card>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">{'\u{1F4B0}'}</div>
          <h2 className="font-serif text-xl font-bold text-ink mb-2">
            Welcome to PayoffIQ
          </h2>
          <p className="text-warm-gray text-sm max-w-md mx-auto">
            Your personal finance command center. Start by adding your loans,
            credit cards, and household bills to see your complete financial picture.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <a href="/loans" className="btn-primary px-4 py-2 rounded-lg font-semibold text-sm no-underline">
              Add a Loan
            </a>
            <a href="/bills" className="px-4 py-2 rounded-lg font-semibold text-sm border border-gold text-gold hover:bg-gold/10 transition-all no-underline">
              Track Bills
            </a>
            <a href="/settings" className="px-4 py-2 rounded-lg font-semibold text-sm text-warm-gray hover:bg-warm-gray/10 transition-all no-underline">
              Configure Settings
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
