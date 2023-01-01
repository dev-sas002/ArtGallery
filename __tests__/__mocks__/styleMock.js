// CSS Modules are handled by Next.js at build time; Jest only needs a stub so
// that importing a stylesheet from a component under test does not throw.
module.exports = new Proxy(
  {},
  {
    get: (_target, key) => (key === '__esModule' ? false : String(key)),
  }
)
