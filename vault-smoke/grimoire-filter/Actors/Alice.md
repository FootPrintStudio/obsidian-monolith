---
tags:
  - smoke
  - grimoire
  - filter
title: Alice
cast:
  - "[[Alice]]"
  - "[[Bob]]"
  - "[[Carol]]"
  - "[[Bob]]"
  - "[[Alice]]"
dupTags:
  - a
  - b
  - a
  - c
  - b
nested:
  - ["[[Alice]]", "[[Bob]]"]
  - ["[[Carol]]", "[[Bob]]"]
---

# Alice — filter / AS / join smoke (G2)

Reading-view smoke for **Monolith ≥ 0.6.1** / Grimoire **1.0** (open **this** note so `this.file` is Alice).  
`@` uses flattened form: `@(from("…"), …)`.

## Cases

| Expect | Query |
|--------|-------|
| a, b, c | `` `q= filter(dupTags, unique)` `` |
| [[Bob]], [[Carol]] | `` `q= filter(cast, {!this.file})` `` |
| [[Bob]], [[Carol]] | `` `q= filter(cast, unique, {!this.file})` `` |
| [[Bob]], [[Carol]] | `` `q= filter(cast, {!this.file}, unique)` `` |
| [[Bob]], [[Carol]] | `` `q= filter(cast, {item != this.file})` `` |
| [[Bob]], [[Carol]] (one-level flatten) | `` `q= filter(nested, unique, {!this.file})` `` |
| a, b, c (plain join string) | `` `q= join(filter(dupTags, unique), ", ")` `` |
| button chips Bob, Carol | `` `q= filter(cast AS button, unique, {!this.file})` `` |
| label + button chips | `` `q= "Cast: " + filter(cast AS button, unique, {!this.file})` `` |
| co-stars Bob, Carol (self-exclude) | `` `q= filter(@(from("Movies"), {contains(actors, this.file)}, actors), unique, {!this.file})` `` |
| co-star buttons | `` `q= filter(@(from("Movies"), {contains(actors, this.file)}, (actors AS button)), unique, {!this.file})` `` |
| label + co-star buttons | `` `q= "Actors: " + filter(@(from("Movies"), {contains(actors, this.file)}, (actors AS button)), unique, {!this.file})` `` |
| join keeps co-star buttons | `` `q= join(filter(@(from("Movies"), {contains(actors, this.file)}, (actors AS button)), unique, {!this.file}), ", ")` `` |

## Live queries

`q= filter(dupTags, unique)`

`q= filter(cast, {!this.file})`

`q= filter(cast, unique, {!this.file})`

`q= filter(cast, {!this.file}, unique)`

`q= filter(cast, {item != this.file})`

`q= filter(nested, unique, {!this.file})`

`q= join(filter(dupTags, unique), ", ")`

`q= filter(cast AS button, unique, {!this.file})`

`q= "Cast: " + filter(cast AS button, unique, {!this.file})`

`q= filter(@(from("Movies"), {contains(actors, this.file)}, actors), unique, {!this.file})`

`q= filter(@(from("Movies"), {contains(actors, this.file)}, (actors AS button)), unique, {!this.file})`

`q= "Actors: " + filter(@(from("Movies"), {contains(actors, this.file)}, (actors AS button)), unique, {!this.file})`

`q= join(filter(@(from("Movies"), {contains(actors, this.file)}, (actors AS button)), unique, {!this.file}), ", ")`
