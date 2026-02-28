import Card from '../components/ui/Card';

export default function ComingSoonPage({ title, icon, description }) {
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-ink mb-6">{title}</h1>
      <Card>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">{icon}</div>
          <h2 className="font-serif text-lg font-bold text-ink mb-2">Coming Soon</h2>
          <p className="text-warm-gray text-sm max-w-md mx-auto">
            {description}
          </p>
        </div>
      </Card>
    </div>
  );
}
