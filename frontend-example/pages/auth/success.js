import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Success() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return <div style={{ padding: 24 }}>Signing you in...</div>;
}
