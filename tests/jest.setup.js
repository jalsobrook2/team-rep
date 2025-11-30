// Polyfills required globals for some node modules when running under Jest/jsdom
// Provide TextEncoder/TextDecoder from Node's util module
const { TextEncoder, TextDecoder } = require('util')
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder
