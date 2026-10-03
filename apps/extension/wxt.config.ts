import { defineConfig } from 'wxt';

export default defineConfig({
  // WXT's dev server defaults to the first open port starting at 3000, which collides
  // with the backend's port, so setting it +1.
  dev: {
    server: {
      port: 3001,
    },
  },
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
    // Storage for caching
    // webRequest lets the background worker check (not modify) network request outcomes
    // need this to build the recent-requests summary attached to a report
    permissions: ['activeTab', 'storage', 'webRequest'],
    // URLs that the extension can interact with
    // Changed from just the backend's own address to <all_urls>  so webRequest can actually check
    // network traffic on whichever allowlisted site the user reports a bug on
    host_permissions: ['<all_urls>'],
  },
});
