/**
 * Behavior tests for js/index.js
 *
 * The script has no exports — it queries the DOM, wires up event listeners,
 * and talks to the backend over fetch as soon as it loads. So instead of
 * unit-testing functions, we load the REAL index.html into a jsdom document,
 * stub fetch with a small in-memory fake of the Express/Mongo API, run the
 * script, fire the same events a user would, and assert on the resulting DOM
 * and on the fake backend's state.
 */

const fs = require('fs');
const path = require('path');

// Pull the <body> out of the real index.html and drop the <script> tag
// (we require the script ourselves so Jest controls when it runs).
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const bodyHtml = html
  .match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
  .replace(/<script[\s\S]*?<\/script>/gi, '');

// ---- in-memory fake of the Express/Mongo backend ----
let db;        // current lists, shaped exactly like the API returns them
let idCounter; // stand-in for Mongo's _id generation

function genId() {
  return String(idCounter++);
}

function jsonResponse(data, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
  });
}

function fakeFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  let m;

  if (url === '/api/lists' && method === 'GET') {
    return jsonResponse(db);
  }
  if (url === '/api/lists' && method === 'POST') {
    const list = { _id: genId(), name: body.name, tasks: [] };
    db.push(list);
    return jsonResponse(list, 201);
  }
  if ((m = url.match(/^\/api\/lists\/([^/]+)\/tasks\/completed$/)) && method === 'DELETE') {
    const list = db.find(l => l._id === m[1]);
    list.tasks = list.tasks.filter(t => !t.complete);
    return jsonResponse(list);
  }
  if ((m = url.match(/^\/api\/lists\/([^/]+)\/tasks\/([^/]+)$/)) && method === 'PATCH') {
    const list = db.find(l => l._id === m[1]);
    list.tasks.find(t => t._id === m[2]).complete = body.complete;
    return jsonResponse(list);
  }
  if ((m = url.match(/^\/api\/lists\/([^/]+)\/tasks$/)) && method === 'POST') {
    const list = db.find(l => l._id === m[1]);
    list.tasks.push({ _id: genId(), name: body.name, complete: false });
    return jsonResponse(list, 201);
  }
  if ((m = url.match(/^\/api\/lists\/([^/]+)$/)) && method === 'DELETE') {
    db = db.filter(l => l._id !== m[1]);
    return jsonResponse(null, 204);
  }
  throw new Error(`fakeFetch: unhandled ${method} ${url}`);
}

// Let every pending fetch/await chain settle before we assert.
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

/** Load a fresh copy of the app into a clean DOM against the current db. */
async function loadApp() {
  jest.resetModules();        // forget the module's previous state
  document.body.innerHTML = bodyHtml;
  require('../js/index.js');  // runs the script: wires listeners + initial loadAndRender()
  await flush();
}

// ---- helpers that drive the UI the way a user would ----

async function addList(name) {
  document.querySelector('[data-new-input-form]').value = name;
  document
    .querySelector('[data-new-list-form]')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flush();
}

async function addTask(name) {
  document.querySelector('[data-new-task-input]').value = name;
  document
    .querySelector('[data-new-task-form]')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flush();
}

function listItems() {
  return [...document.querySelectorAll('[data-list] li')];
}

function selectList(index) {
  listItems()[index].click(); // selecting is synchronous (no fetch)
}

function taskCheckboxes() {
  return [...document.querySelectorAll('[data-tasks] input[type="checkbox"]')];
}

beforeEach(async () => {
  db = [];
  idCounter = 1000;
  global.fetch = jest.fn(fakeFetch);
  await loadApp();
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

describe('creating lists', () => {
  test('adding a list renders it and saves it to the backend', async () => {
    await addList('Groceries');

    expect(listItems()).toHaveLength(1);
    expect(listItems()[0].textContent).toBe('Groceries');
    expect(db).toHaveLength(1);
    expect(db[0].name).toBe('Groceries');
  });

  test('a blank list name is ignored', async () => {
    await addList('');
    await addList('   '.trim()); // empty after trim is still ""

    expect(listItems()).toHaveLength(0);
    expect(db).toHaveLength(0);
  });

  test('the task panel is hidden until a list is selected', async () => {
    const panel = document.querySelector('[data-list-display-container]');
    expect(panel.style.display).toBe('none');

    await addList('Work');
    selectList(0);

    expect(panel.style.display).not.toBe('none');
    expect(document.querySelector('[data-list-title]').innerText).toBe('Work');
  });
});

describe('selecting lists', () => {
  test('clicking a list marks it active', async () => {
    await addList('A');
    await addList('B');
    selectList(1);

    expect(listItems()[1].classList.contains('active-list')).toBe(true);
    expect(listItems()[0].classList.contains('active-list')).toBe(false);
  });
});

describe('creating tasks', () => {
  beforeEach(async () => {
    await addList('Chores');
    selectList(0);
  });

  test('adding a task renders it and saves it under the selected list', async () => {
    await addTask('Wash dishes');

    expect(taskCheckboxes()).toHaveLength(1);
    expect(document.querySelector('[data-tasks] label').textContent).toContain(
      'Wash dishes'
    );
    expect(db[0].tasks).toHaveLength(1);
    expect(db[0].tasks[0]).toMatchObject({
      name: 'Wash dishes',
      complete: false,
    });
  });

  test('a blank task name is ignored', async () => {
    await addTask('');
    expect(taskCheckboxes()).toHaveLength(0);
  });
});

describe('task counter', () => {
  beforeEach(async () => {
    await addList('Chores');
    selectList(0);
  });

  function counterText() {
    return document.querySelector('[data-list-counter]').innerText;
  }

  test('uses the singular word for exactly one remaining task', async () => {
    await addTask('Only one');
    expect(counterText()).toBe('1 task remaining');
  });

  test('uses the plural word for multiple remaining tasks', async () => {
    await addTask('First');
    await addTask('Second');
    expect(counterText()).toBe('2 tasks remaining');
  });

  test('completing a task lowers the remaining count and persists it', async () => {
    await addTask('First');
    await addTask('Second');

    taskCheckboxes()[0].click(); // toggles checked + fires the click handler
    await flush();

    expect(counterText()).toBe('1 task remaining');
    expect(db[0].tasks[0].complete).toBe(true);
    expect(db[0].tasks[1].complete).toBe(false);
  });
});

describe('clearing and deleting', () => {
  test('clear-completed removes only the completed tasks', async () => {
    await addList('Chores');
    selectList(0);
    await addTask('Keep me');
    await addTask('Remove me');

    taskCheckboxes()[1].click(); // complete "Remove me"
    await flush();
    document.querySelector('[data-clear-complete-button]').click();
    await flush();

    expect(taskCheckboxes()).toHaveLength(1);
    expect(db[0].tasks).toHaveLength(1);
    expect(db[0].tasks[0].name).toBe('Keep me');
  });

  test('deleting a list removes it and hides the task panel', async () => {
    await addList('Temp');
    selectList(0);

    document.querySelector('[data-delete-list-button]').click();
    await flush();

    expect(listItems()).toHaveLength(0);
    expect(db).toHaveLength(0);
    expect(
      document.querySelector('[data-list-display-container]').style.display
    ).toBe('none');
  });
});

describe('loading from the backend', () => {
  test('lists already stored in the backend are rendered on load', async () => {
    db = [{ _id: '42', name: 'Saved list', tasks: [] }];

    await loadApp();

    expect(listItems()).toHaveLength(1);
    expect(listItems()[0].textContent).toBe('Saved list');
  });
});
