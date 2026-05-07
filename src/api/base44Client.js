import * as Base44 from '@base44/sdk';

const base44 = Base44.createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  token: import.meta.env.VITE_BASE44_TOKEN,
  functionsVersion: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION || '1',
  appBaseUrl: import.meta.env.VITE_BASE44_APP_BASE_URL,
});

export default base44;
export { base44 };