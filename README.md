## todo-list-categorized
#live version(https://angry-curie-b1e4bb.netlify.app/).

This a very categorized TODO app 
![](https://github.com/leonelRos/todo-list-categorized/blob/master/img/Screen%20Shot%202020-04-15%20at%206.14.39%20PM.png)

## Testing

The app is covered by a [Jest](https://jestjs.io/) test suite that loads the real
`index.html` into a simulated browser (jsdom), runs `js/index.js`, and fires the
same events a user would — submitting forms, selecting lists, checking off tasks —
then asserts on the resulting DOM and `localStorage`.

Install dependencies once:

```bash
npm install
```

Then run the tests:

```bash
npm test            # run the suite once
npm run test:watch  # re-run automatically as you edit
```

The tests live in `__tests__/index.test.js`. Add a case alongside each new feature
so regressions get caught before they go live.

## Continuous integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs `npm test` on every push
and pull request to `master`. If the tests fail, the run is marked red — so broken
changes are flagged before they're merged or deployed.
