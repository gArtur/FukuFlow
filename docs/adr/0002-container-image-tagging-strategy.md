# Container image tags: `:latest` is the newest stable release, `:edge` is the latest `main` build

The GHCR image (`ghcr.io/<owner>/fukuflow`) is tagged so each tag has one unambiguous meaning:

- **`:latest`** - the newest non-prerelease **release** (highest semver tag). This is what the
  README quick-start tells users to pull.
- **`:edge`** - the latest build off `main` (bleeding edge, may be unstable).
- **`:1.2.3` / `:1.2` / `:1`** - exact and rolling semver tags for pinning a deployment.
- **`:sha-<short>`** - the exact commit build, for debugging or precise rollback.

`:latest` is driven by `docker/metadata-action`'s `latest=auto` flavor (only the highest stable
semver tag claims it); `:edge` is a raw tag gated to the default branch.

## Why

- **The previous `:latest` was contested.** A raw rule set `:latest` on every `main` push *and*
  `metadata-action`'s default `latest=auto` set `:latest` on every semver tag. Its meaning was
  "whatever pushed most recently" - sometimes a `main` build, sometimes a release.
- **Convention.** Docker's de-facto convention is that `:latest` is the newest stable release. A
  quick-start user pulling `:latest` should get a release, not an unvetted `main` build. `:edge` is
  the well-known (Alpine/Docker) name for the bleeding-edge build, so testers have a clear pointer.
- **Separation of concerns.** Splitting the two floating pointers means moving one never disturbs the
  other: cutting a release no longer overwrites the `main` pointer, and merging to `main` no longer
  overwrites the release pointer.

## Rejected alternatives

- **Keep `:latest` = `main` and add a separate `:release`/`:stable` tag.** This was the original
  request. Rejected because it keeps `:latest` meaning "bleeding edge," which contradicts the common
  convention and surprises anyone who pulls `:latest` expecting a stable image - the exact confusion
  we want to remove.
- **Rely only on semver tags (no floating "current release" pointer).** Rejected because there is no
  convenient "just give me the current release" tag, which the quick-start flow needs.
- **Pre-release-aware floating tags (`-rc`/`-beta` handling).** Deferred: the project does not publish
  pre-releases. `latest=auto` is already pre-release-safe, so this can be revisited for free if needed.

## Consequence

Anyone who was pulling `:latest` to get the bleeding-edge `main` build must switch to `:edge`; this is
documented in the README. The trade-off is deliberate: a one-time migration for consumers in exchange
for tags whose meaning is stable and conventional going forward.
