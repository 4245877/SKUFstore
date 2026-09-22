import { getTranslator } from '../../i18n/translate';
export default function NotFound() {
  return <main style={{ padding: '3rem' }}><h1>{getTranslator('uk')('errors.notFound')}</h1></main>;
}
