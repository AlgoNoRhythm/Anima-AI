import { NextResponse } from 'next/server';
import { createDatabase } from '@anima-ai/database';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const db = createDatabase();
    await db.execute('SELECT 1');
    return NextResponse.json({ status: 'ok', db: 'connected', timestamp });
  } catch {
    return NextResponse.json({ status: 'degraded', db: 'disconnected', timestamp });
  }
}
