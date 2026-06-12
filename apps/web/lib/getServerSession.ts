import { getServerSession as getServerSessionNextAuth } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

function clean(obj: any): any {
  if (obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(clean);
  if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(obj)) {
      cleaned[k] = clean(v);
    }
    return cleaned;
  }
  return obj;
}

export async function getServerSession(context: any) {
  const session = await getServerSessionNextAuth(context.req, context.res, authOptions);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  return { props: { session: clean(session) } };
}
