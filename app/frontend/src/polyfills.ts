// Polyfills for Node.js modules in the browser (required for MultiversX SDK)
// Note: Critical globals (global, process, util, stream) are set in index.html inline script

// Buffer polyfill
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

// Crypto polyfill using SubtleCrypto
if (typeof (window as any).crypto === 'undefined') {
  (window as any).crypto = (window as any).msCrypto;
}
