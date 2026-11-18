# Pruebas de RLS del módulo Habitaciones (solo base LOCAL)
1. En una carpeta temporal fuera del repo: `supabase init` y `supabase start` (sin `link`, sin login).
2. Aplica `supabase/migrations/habitaciones_ALL.sql` en la base local (por ejemplo con `docker exec -i supabase_db_<proyecto> psql -U postgres -d postgres -v ON_ERROR_STOP=1 < habitaciones_ALL.sql`).
3. Ejecuta, en este orden y con el mismo método: `setup.sql`, `tests.sql`, `tests2.sql`. Cada prueba imprime `PASS` o `FAIL`.
4. `scripts/dev/hab-repo-local.ts` ejecuta `supabaseRepo` contra esa base con `SB_URL`, `SB_ANON` y `SB_SERVICE` de `supabase status -o env` (nunca contra la nube: rechaza URLs que no sean locales).
5. `supabase stop` al terminar.
