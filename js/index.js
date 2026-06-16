const listContainer = document.querySelector('[data-list]');
const newListForm = document.querySelector('[data-new-list-form]')
const newInputForm = document.querySelector('[data-new-input-form]')
const deleteListButton = document.querySelector('[data-delete-list-button]')
const listDisplayContainer = document.querySelector('[data-list-display-container]')
const listTitleElement = document.querySelector('[data-list-title]')
const listCountELement = document.querySelector('[data-list-counter]')
const tasksContainer = document.querySelector('[data-tasks]')
const taskTemplate = document.getElementById('task-template')
const newTaskForm = document.querySelector('[data-new-task-form]')
const newTaskInput = document.querySelector('[data-new-task-input]')
const clearCompleteTaskButton = document.querySelector('[data-clear-complete-button]')

// data now lives in MongoDB; `lists` is just an in-memory copy of what the server returns
let lists = [];
let selectedListId = null;

listContainer.addEventListener('click', async e => {
    if(e.target.tagName.toLowerCase() === 'li') {
        selectedListId = e.target.dataset.listId
        render()
    }
})

tasksContainer.addEventListener('click', async e => {
    if(e.target.tagName.toLowerCase() === 'input'){
        await fetch(`/api/lists/${selectedListId}/tasks/${e.target.id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({complete: e.target.checked})
        })
        await loadAndRender();
    }
})

clearCompleteTaskButton.addEventListener('click', async e => {
    await fetch(`/api/lists/${selectedListId}/tasks/completed`, { method: 'DELETE' })
    await loadAndRender();
})

deleteListButton.addEventListener('click', async e => {
    await fetch(`/api/lists/${selectedListId}`, { method: 'DELETE' })
    selectedListId = null;
    await loadAndRender();
})

newListForm.addEventListener('submit', async e => {
    e.preventDefault()
    //getting the name of the input
    const listName = newInputForm.value
    if(!listName) return;
    await fetch('/api/lists', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: listName})
    })
    newInputForm.value = null
    await loadAndRender();
})

newTaskForm.addEventListener('submit', async e => {
    e.preventDefault()
    //getting the name of the input
    const taskName = newTaskInput.value
    if(!taskName) return;
    await fetch(`/api/lists/${selectedListId}/tasks`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: taskName})
    })
    newTaskInput.value = null
    await loadAndRender();
})

// fetch all lists from the backend into our local `lists` variable
async function loadLists () {
    const res = await fetch('/api/lists');
    lists = await res.json()
}

// pull fresh data from the server, then re-draw the screen
async function loadAndRender() {
    await loadLists();
    render();
}

function render() {
    clearListContainer(listContainer)
   renderLists();

   const selectedList = lists.find(list => list._id === selectedListId)
   if(selectedList == null){
    listDisplayContainer.style.display = 'none';
   } else {
    listDisplayContainer.style.display = '';
    listTitleElement.innerText = selectedList.name;
    renderTaskCount(selectedList)
    clearListContainer(tasksContainer)
    renderTasks(selectedList)
   }
}

function renderTasks(selectedList){
    selectedList.tasks.forEach(task => {
        const taskElement = document.importNode(taskTemplate.content, true)
        const checkbox = taskElement.querySelector('input')
        checkbox.id = task._id
        checkbox.checked = task.complete
        const label = taskElement.querySelector('label')
        label.htmlFor = task._id
        label.append(task.name)
        tasksContainer.appendChild(taskElement)
    })
}

function renderTaskCount(selectedList) {
    const incompleteTasksCount = selectedList.tasks.filter(task =>  !task.complete).length
    const taskString = incompleteTasksCount === 1 ? "task": "tasks"
    listCountELement.innerText = `${incompleteTasksCount} ${taskString} remaining`
}

function renderLists() {
    lists.forEach( list => {
        //here we create a li tag for our tasl-list
        const listElement = document.createElement('li');
        //we are giving the Id an atribute
        listElement.dataset.listId = list._id
        listElement.classList.add("list-name")
        listElement.innerHTML = list.name
        if(list._id === selectedListId){
            listElement.classList.add('active-list')
        }
        listContainer.appendChild(listElement);
    })
}

function clearListContainer (element){
    while(element.firstChild) {
        element.removeChild(element.firstChild)
    }
}

loadAndRender();
