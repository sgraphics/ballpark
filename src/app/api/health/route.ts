import { NextResponse } from 'next/server';
import { runMigrations } from '@/lib/migrations';

export async function GET() {
  try {
    const result = await runMigrations();
    return NextResponse.json({
      status: 'ok',
      migrations: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
