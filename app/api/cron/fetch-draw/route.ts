import { fetchLastDraw } from '@/lib/etipos';
import { getSupabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
}

async function insertJobRun(status: 'success' | 'duplicate' | 'error', message: string, payload?: unknown) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('job_runs').insert({
      status,
      message,
      payload: payload ?? null
    });
  } catch (error) {
    console.error('Failed to write job_runs log:', error);
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  try {
    const lastDraw = await fetchLastDraw();
    const supabase = getSupabaseAdmin();

    const row = {
      draw_id: lastDraw.drawId,
      draw_time: new Date(lastDraw.drawDate).toISOString(),
      next_draw_time: lastDraw.nextDrawDate ? new Date(lastDraw.nextDrawDate).toISOString() : null,
      numbers: lastDraw.drawNumbers,
      numbers_csv: lastDraw.drawNumbersCsv,
      source: 'etipos_getlastdraw',
      raw_payload: {
        countdownSeconds: lastDraw.countdownSeconds,
        rawXml: lastDraw.rawXml
      }
    };

    const { error } = await supabase.from('draws').upsert(row, {
      onConflict: 'draw_id',
      ignoreDuplicates: false
    });

    if (error) {
      throw error;
    }

    await insertJobRun('success', `Draw ${lastDraw.drawId} saved or updated.`, {
      drawId: lastDraw.drawId
    });

    return NextResponse.json({
      ok: true,
      drawId: lastDraw.drawId,
      numbers: lastDraw.drawNumbers,
      drawTime: row.draw_time,
      nextDrawTime: row.next_draw_time
    });
  } catch (error) {
    console.error('fetch-draw failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    await insertJobRun('error', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

