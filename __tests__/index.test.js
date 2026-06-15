/**
 * Behavior tests for js/index.js
 *
 * The script has no exports — it queries the DOM and wires up event
 * listeners as soon as it loads. So instead of unit-testing functions,
 * we load the REAL index.html into a jsdom document, run the script,
 * fire the same events a user would, and assert on the resulting DOM
 * and localStorage. If you change a data-* attribute or break a flow,
 * these tests fail.
 */

const fs = require('fs');
const path = require('path');

// Pull the <body> out of the real index.html and drop the <script> tag
// (we require the script ourselves so Jest controls when it runs).
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const bodyHtml = html
  .match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
  .replace(/<script[\s\S]*?<\/script>/gi, '');

let nextId;

/** Load a fresh copy of the app into a clean DOM + storage. */
function loadApp() {
  jest.resetModules();        // forget the module's previous state
  localStorage.clear();
  document.body.innerHTML = bodyHtml;
  require('../js/index.js');  // runs the script: wires listeners + initial render
}

// ---- helpers that drive the UI the way a user would ----

function addList(name) {
  document.querySelector('[data-new-input-form]').value = name;
  document
    .querySelector('[data-new-list-form]')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function addTask(name) {
  document.querySelector('[data-new-task-input]').value = name;
  document
    .querySelector('[data-new-task-form]')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function listItems() {
  return [...document.querySelectorAll('[data-list] li')];
}

function selectList(index) {
  listItems()[index].click();
}

function taskCheckboxes() {
  return [...document.querySelectorAll('[data-tasks] input[type="checkbox"]')];
}

function storedLists() {
  return JSON.parse(localStorage.getItem('task.lists'));
}

beforeEach(() => {
  // Date.now() is used to generate ids; force unique, predictable ids
  // so tasks/lists created in the same millisecond don't collide.
  nextId = 1000;
  jest.spyOn(Date, 'now').mockImplementation(() => nextId++);
  loadApp();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('creating lists', () => {
  test('adding a list renders it and saves it to localStorage', () => {
    addList('Groceries');

    expect(listItems()).toHaveLength(1);
    expect(listItems()[0].textContent).toBe('Groceries');
    expect(storedLists()).toHaveLength(1);
    expect(storedLists()[0].name).toBe('Groceries');
  });

  test('a blank list name is ignored', () => {
    addList('');
    addList('   '.trim()); // empty after trim is still ""

    expect(listItems()).toHaveLength(0);
    expect(storedLists() || []).toHaveLength(0);
  });

  test('the task panel is hidden until a list is selected', () => {
    const panel = document.querySelector('[data-list-display-container]');
    expect(panel.style.display).toBe('none');

    addList('Work');
    selectList(0);

    expect(panel.style.display).not.toBe('none');
    expect(document.querySelector('[data-list-title]').innerText).toBe('Work');
  });
});

describe('selecting lists', () => {
  test('clicking a list marks it active and persists the selection', () => {
    addList('A');
    addList('B');
    selectList(1);

    expect(listItems()[1].classList.contains('active-list')).toBe(true);
    expect(listItems()[0].classList.contains('active-list')).toBe(false);
    expect(localStorage.getItem('task.selectedListId')).toBe(storedLists()[1].id);
  });
});

describe('creating tasks', () => {
  beforeEach(() => {
    addList('Chores');
    selectList(0);
  });

  test('adding a task renders it and saves it under the selected list', () => {
    addTask('Wash dishes');

    expect(taskCheckboxes()).toHaveLength(1);
    expect(document.querySelector('[data-tasks] label').textContent).toContain(
      'Wash dishes'
    );
    expect(storedLists()[0].tasks).toHaveLength(1);
    expect(storedLists()[0].tasks[0]).toMatchObject({
      name: 'Wash dishes',
      complete: false,
    });
  });

  test('a blank task name is ignored', () => {
    addTask('');
    expect(taskCheckboxes()).toHaveLength(0);
  });
});

describe('task counter', () => {
  beforeEach(() => {
    addList('Chores');
    selectList(0);
  });

  function counterText() {
    return document.querySelector('[data-list-counter]').innerText;
  }

  test('uses the singular word for exactly one remaining task', () => {
    addTask('Only one');
    expect(counterText()).toBe('1 task remaining');
  });

  test('uses the plural word for multiple remaining tasks', () => {
    addTask('First');
    addTask('Second');
    expect(counterText()).toBe('2 tasks remaining');
  });

  test('completing a task lowers the remaining count and persists it', () => {
    addTask('First');
    addTask('Second');

    taskCheckboxes()[0].click(); // toggles checked + fires the click handler

    expect(counterText()).toBe('1 task remaining');
    expect(storedLists()[0].tasks[0].complete).toBe(true);
    expect(storedLists()[0].tasks[1].complete).toBe(false);
  });
});

describe('clearing and deleting', () => {
  test('clear-completed removes only the completed tasks', () => {
    addList('Chores');
    selectList(0);
    addTask('Keep me');
    addTask('Remove me');

    taskCheckboxes()[1].click(); // complete "Remove me"
    document.querySelector('[data-clear-complete-button]').click();

    expect(taskCheckboxes()).toHaveLength(1);
    expect(storedLists()[0].tasks).toHaveLength(1);
    expect(storedLists()[0].tasks[0].name).toBe('Keep me');
  });

  test('deleting a list removes it and hides the task panel', () => {
    addList('Temp');
    selectList(0);

    document.querySelector('[data-delete-list-button]').click();

    expect(listItems()).toHaveLength(0);
    expect(storedLists()).toHaveLength(0);
    expect(
      document.querySelector('[data-list-display-container]').style.display
    ).toBe('none');
  });
});

describe('persistence across reloads', () => {
  test('lists saved to localStorage are rendered on the next load', () => {
    localStorage.setItem(
      'task.lists',
      JSON.stringify([{ id: '42', name: 'Saved list', tasks: [] }])
    );

    // Re-run the script against the existing storage (no localStorage.clear).
    jest.resetModules();
    document.body.innerHTML = bodyHtml;
    require('../js/index.js');

    expect(listItems()).toHaveLength(1);
    expect(listItems()[0].textContent).toBe('Saved list');
  });
});
