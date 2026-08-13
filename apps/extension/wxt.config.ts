import { defineConfig } from 'wxt';

export default defineConfig({
  // Manifest is the extension's core properties and permissions,
  // automatically gets generated in the build as manifest.json in .output
  manifest: {
    name: 'Bug Snipper',
    // Action configures how the extension's toolbar ineraction works
    // Need this field even if empty initially else errors
    action: {},
    // List of APIs or capabilities the extension requires access to
    // i.e. activeTab: act on the current tab only after a direct user gesture (clicking the extension)
    // this is for purpose of getting an ss
    permissions: ['activeTab'],
    // URLs that the extension can interact with
    // this is what lets the background service worker's fetch() reach the backend
    host_permissions: ['http://localhost:3000/*'],
  },
});
