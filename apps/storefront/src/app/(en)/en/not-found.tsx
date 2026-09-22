import { getTranslator } from '../../../i18n/translate';
export default function NotFound() {
  return <main style={{ padding: '3rem' }}><h1>{getTranslator('en')('errors.notFound')}</h1></main>;
}
