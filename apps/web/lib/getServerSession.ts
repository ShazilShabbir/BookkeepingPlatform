import type { GetServerSidePropsContext } from 'next';
import { getServerSession as getServerSessionNextAuth } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

function clean<T>(obj: T): T | null {
  if (obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(clean) as T;
  if (obj && typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      cleaned[k] = clean(v);
    }
    return cleaned as T;
  }
  return obj;
}

export async function getServerSession(context: GetServerSidePropsContext) {
  const session = await getServerSessionNextAuth(context.req, context.res, authOptions);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  return { props: { session: clean<Session>(session) } };
}
