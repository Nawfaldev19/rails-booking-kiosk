# References

Only official documentation, specifications and well-known books are listed.

## Database

- **PostgreSQL documentation, "Range Types"**, including "Constraints on Ranges" (exclusion constraints with `&&`). <https://www.postgresql.org/docs/current/rangetypes.html>
- **PostgreSQL documentation, `CREATE TABLE` → `EXCLUDE`.** <https://www.postgresql.org/docs/current/sql-createtable.html>
- **PostgreSQL documentation, the `btree_gist` module.** <https://www.postgresql.org/docs/current/btree-gist.html>
- **PostgreSQL documentation, "Explicit Locking"**: record-level locks, `FOR UPDATE`, `SKIP LOCKED`. <https://www.postgresql.org/docs/current/explicit-locking.html>
- **Martin Kleppmann, *Designing Data-Intensive Applications* (O'Reilly, 2017).** Chapter 7 (Transactions) covers write skew and phantoms, the class of race that the exclusion constraint closes.

## Rails and GraphQL

- **Ruby on Rails Guides, "Active Record Migrations"** and **"Active Record and PostgreSQL"** (range types, exclusion constraints, composite foreign keys). <https://guides.rubyonrails.org/active_record_postgresql.html>
- **Ruby on Rails Guides, "Securing Rails Applications"** (sessions, CSRF). <https://guides.rubyonrails.org/security.html>
- **Ruby on Rails API:** `authenticate_by`, `generates_token_for`, `has_secure_password`. <https://api.rubyonrails.org/>
- **GraphQL Ruby documentation:** mutations, connections, scoped context. <https://graphql-ruby.org/>
- **GraphQL specification (October 2021).** <https://spec.graphql.org/October2021/>
- **Relay Cursor Connections specification.** <https://relay.dev/graphql/connections.htm>

## Patterns

- **Chris Richardson, "Pattern: Transactional outbox"**, microservices.io. <https://microservices.io/patterns/data/transactional-outbox.html>
- **Martin Fowler, *Patterns of Enterprise Application Architecture* (Addison-Wesley, 2002).** Service Layer and Optimistic/Pessimistic Offline Lock.

## Security

- **OWASP Cheat Sheet Series: "Cross-Site Request Forgery Prevention"** and **"Session Management".** <https://cheatsheetseries.owasp.org/>
- **MDN, "Set-Cookie: SameSite".** <https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie>
- **Shopify Liquid documentation** (strict variables and filters). <https://shopify.github.io/liquid/>

## Standards

The standards this repository follows are listed with links in the [documentation map](../README.md#conventions). Also used: STRIDE threat modelling (<https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats>) and the OWASP HTTP Headers Cheat Sheet (<https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html>).

## Front end

- **Apollo Client documentation** (caching, `typePolicies`, pagination). <https://www.apollographql.com/docs/react/>
- **GraphQL Code Generator, client preset.** <https://the-guild.dev/graphql/codegen/plugins/presets/preset-client>
- **React Router documentation.** <https://reactrouter.com/>
- **W3C, WCAG 2.2.** <https://www.w3.org/TR/WCAG22/>
- **MDN, `Intl.DateTimeFormat`.** <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat>
