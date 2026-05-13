import VerifyAgeClient from './VerifyAgeClient';

function getSafeReturnTo(value: string | undefined) {
  if (!value) return '/catalog';

  if (!value.startsWith('/') || value.startsWith('//')) {
    return '/catalog';
  }

  return value;
}

export default async function AgeVerificationPage({
  searchParams,
}: {
  searchParams?: Promise<{
    returnTo?: string;
  }>;
}) {
  const params = await searchParams;
  const returnTo = getSafeReturnTo(params?.returnTo);
 
  return <VerifyAgeClient returnTo={returnTo} />;
}