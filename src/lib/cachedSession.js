// Usuario de la última sesión guardada en este dispositivo (la que Supabase
// persiste en localStorage). Solo sirve para mostrar la app sin conexión cuando
// el token ya caducó y no se puede renovar: no da acceso a ningún dato del
// servidor. Al volver internet, Supabase renueva la sesión con su refresh token.
export function readCachedUser(storage = globalThis.localStorage) {
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (!/^sb-.+-auth-token$/.test(key)) continue
      const user = JSON.parse(storage.getItem(key))?.user
      if (user?.id) return user
    }
  } catch { /* almacenamiento no disponible o JSON dañado */ }
  return null
}
