# Reconstruction Notes

Official product baseline: Hatchable project `otsflow-ceo-demo`, version 22.

The deployed V22 project was discovered with 18 public/source files plus one `/api/qa` function and no database tables. The live application persists business data in browser `localStorage`.

This package is intentionally a **public-safe reconstruction** rather than a byte-identical archive:

- sample/personal identifiers are generalized;
- confidential/customer content is excluded;
- the exact deployed third-party vendor bundles and refinery image are not represented as project-authored code;
- optional QR and Excel libraries are referenced through public CDNs in this reconstruction;
- the stale legacy `/api/qa` test is documented but not copied as release evidence;
- version residue such as `otsflow_v18` and the old V19 backup filename is normalized in this public package.

Known deployed V22 hashes recorded during discovery include:

- `public/index.html`: `529118c1d4b157b0bb68c82cd2958e7711c0de4e3ee698fd261faee565cd56ee`
- `public/app.html`: `48d8589b17d6c546c0ff92de9c3981beeecd41c8128d18c6134560209949e8bb`
- `public/app.js`: `c385064545f2952c2a0827d324de7320b112d40101e4dc9f6725b767190100b0`
- `public/styles.css`: `a8bd2f1559595688ee6c122b4239b3da220efa6dea05c1c79bfc9223814a4c99`
- `public/manifest.webmanifest`: `3bb736ef969acea8b289d79eae95a91da0563a8fd90ed904ef673d0efe99e4f0`
- `public/sw.js`: `0fb72e15309e7d47114b11efc2610255e6ffc37b0f4a133502096a6495c4690b`
- `api/qa.js`: `45ffa51b5c389356df0d6450fd714b9ae14f7a4d4190bc310ac588c671e5e175`

These hashes identify the original deployed baseline; they are **not** expected to equal the reconstructed public-safe files.
