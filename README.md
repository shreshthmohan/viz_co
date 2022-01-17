## Build UMD bundle

```
yarn build
```

## Run demo

Just open the `index.html` for the chosen chart. As an example, for mace chart, open `demo/src/mace.index.html` after running a server.

## Build CSS file after making changes to styles.

### For unminified file in watch mode

Enables faster iterations during development

```
cd demo
yarn css:watch
```

### For minified production build

```
cd demo
yarn css:build
```

### Creating and pushing tags

```sh
git tag -a 0.1 -m 'first release - official end of project'
git push origin --tags
```
