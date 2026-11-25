const toolConfig = {
  id: 'basic-auth-header-generator',
  name: 'Basic Auth Header Generator',
  category: 'Developer',
  description:
    'Generates HTTP Basic Authorization header values (plus curl/fetch snippets) from a username and password, fully client-side.',
  version: '1.0.0',
  exportFormats: ['json'] as import('@itsjust/core').ExportFormat[],
  features: {
    export: false,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    brand: 'Basic Auth Header Generator',
  },
};

export default toolConfig;
