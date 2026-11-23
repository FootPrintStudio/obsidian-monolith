# Grimoire syntax consistency smoke (Monolith 0.6.0 / PQL 1.0)

Copy into the Test Vault and open in Reading view with Monolith Grimoire enabled.

## Must pass

| Expect | Expression |
|--------|------------|
| Page list | `` `q= @(from("Employees/Management"))` `` |
| Titles (map, no where) | `` `q= @(from("Employees/Management"), title)` `` |
| Where + map | `` `q= @(from("Employees/Management"), {exists(title)}, title)` `` |
| contains branch | `` `q= contains(title, "ell", {"yes", "no"})` `` |
| choice brace | `` `q= choice(true, {"a", "b"})` `` |
| inRange bool | `` `q= choice(inRange(5, 1, 10), {"in", "out"})` `` |
| inRange ternary | `` `q= inRange({5, 1, 10}, {"lo", "ok", "hi"})` `` |

## Must fail (parse / empty error)

| Old form | Why |
|----------|-----|
| `` `q= @({from("Employees/Management")})` `` | Brace-wrapped `from` removed |
| `` `q= contains({title, "ell"}, {"yes", "no"})` `` | Packed subject pair removed |
| `` `q= choice(true, "a", "b")` `` | Brace-less choice removed |

Full employee fixtures: project store `docs/vault-smoke/p7-cross-note-at/`.
