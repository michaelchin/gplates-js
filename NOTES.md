#### compile

`npm run compile`

#### test the module

- in module root folder, run `npm link`
- in test folder, run `npm link gplates`
- `cd src/test`
- `node test-use-require.cjs`
- `cd dist/test`
- `node main.cjs`

#### publish

- `npm login`
- `npm publish`

#### public scoped NPM packages

- `npm init --scope=@gplates`
- `npm publish --access public/private`

#### Check the package

- run `npm pack` to make sure the correct files are included.
