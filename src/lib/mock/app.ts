// Simulação do firebase/app para a versão de demonstração.
const app = { name: 'demo', options: {} }
export function initializeApp(): typeof app {
  return app
}
export function getApps(): (typeof app)[] {
  return [app]
}
export function getApp(): typeof app {
  return app
}
