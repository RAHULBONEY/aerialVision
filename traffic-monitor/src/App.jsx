import Header from "./components/shared/Header";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header role="TRAFFIC POLICE" />

      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* We will build these Panels next */}
          <div className="md:col-span-3 aspect-video bg-card rounded-xl border border-border flex items-center justify-center">
            <p className="text-muted-foreground italic">Live Traffic Feed Loading...</p>
          </div>

          <div className="space-y-6">
            <div className="h-32 bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase">Congestion Level</h3>
              <p className="text-3xl font-bold text-success mt-2">LOW</p>
            </div>
            <div className="h-32 bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase">Vehicle Count</h3>
              <p className="text-3xl font-bold text-primary mt-2">124</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;