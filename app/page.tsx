import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type DrawRow = {
  draw_id: number;
  draw_time: string;
  next_draw_time: string | null;
  numbers: number[];
  inserted_at: string;
};

type JobRunRow = {
  status: string;
  message: string | null;
  created_at: string;
};

function formatDate(value: string | null) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('sk-SK', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  });
}

export default async function HomePage() {
  const supabase = getSupabaseAdmin();

  const [{ data: draws }, { data: jobs }] = await Promise.all([
    supabase
      .from('draws')
      .select('draw_id, draw_time, next_draw_time, numbers, inserted_at')
      .order('draw_time', { ascending: false })
      .limit(20),
    supabase
      .from('job_runs')
      .select('status, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  const lastDraw = (draws?.[0] as DrawRow | undefined) ?? null;
  const totalDraws = draws?.length ?? 0;
  const lastJob = (jobs?.[0] as JobRunRow | undefined) ?? null;

  return (
    <main className="container">
      <div style={{ marginBottom: 24 }}>
        <h1>Tipos Keno Collector</h1>
        <p className="muted">
          Privátny dashboard pre live zber žrebovaní. Konečne niečo užitočné namiesto ďalšej tabuľky, ktorú nikto
          neaktualizuje. 🙂
        </p>
      </div>

      <section className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Posledný draw ID</h3>
          <p style={{ fontSize: 32, fontWeight: 700 }}>{lastDraw?.draw_id ?? 'N/A'}</p>
          <p className="muted">Čas draw: {formatDate(lastDraw?.draw_time ?? null)}</p>
        </div>
        <div className="card">
          <h3>Ďalšie žrebovanie</h3>
          <p style={{ fontSize: 20, fontWeight: 700 }}>{formatDate(lastDraw?.next_draw_time ?? null)}</p>
          <p className="muted">Údaj priamo zo zdroja eTIPOS</p>
        </div>
        <div className="card">
          <h3>Stav posledného jobu</h3>
          <p style={{ fontSize: 20, fontWeight: 700 }}>{lastJob?.status ?? 'N/A'}</p>
          <p className="muted">{lastJob?.message ?? 'Bez logu.'}</p>
        </div>
      </section>

      <section className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h2>Vyžrebované čísla</h2>
          {lastDraw ? (
            <div className="numbers">
              {lastDraw.numbers.map((num) => (
                <span key={num} className="ball">
                  {num}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">Zatiaľ nič v databáze.</p>
          )}
        </div>
        <div className="card">
          <h2>Rýchly stav</h2>
          <p>
            <strong>Počet načítaných drawov na stránke:</strong> {totalDraws}
          </p>
          <p>
            <strong>Posledný insert:</strong> {formatDate(lastDraw?.inserted_at ?? null)}
          </p>
          <p>
            <strong>Cron route:</strong> <code>/api/cron/fetch-draw</code>
          </p>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Posledné žrebovania</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Draw ID</th>
                <th>Čas</th>
                <th>Ďalší čas</th>
                <th>Čísla</th>
              </tr>
            </thead>
            <tbody>
              {(draws as DrawRow[] | null)?.map((draw) => (
                <tr key={draw.draw_id}>
                  <td>{draw.draw_id}</td>
                  <td>{formatDate(draw.draw_time)}</td>
                  <td>{formatDate(draw.next_draw_time)}</td>
                  <td>{draw.numbers.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Posledné job logy</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Čas</th>
                <th>Status</th>
                <th>Správa</th>
              </tr>
            </thead>
            <tbody>
              {(jobs as JobRunRow[] | null)?.map((job, index) => (
                <tr key={`${job.created_at}-${index}`}>
                  <td>{formatDate(job.created_at)}</td>
                  <td>{job.status}</td>
                  <td>{job.message ?? 'Bez textu'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
