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

//creating a new key:value to save our data
const LOCAL_STORAGE_LIST_KEY = 'task.lists'
const LOCAL_STORAGE_SELECETED_LIST_ID_KEY = 'task.selectedListId'
//create a variable list
var lists = JSON.parse(localStorage.getItem(LOCAL_STORAGE_LIST_KEY)) || [];
var selectedListId = localStorage.getItem(LOCAL_STORAGE_SELECETED_LIST_ID_KEY)

listContainer.addEventListener('click', e => {
    if(e.target.tagName.toLowerCase() === 'li') {
        selectedListId = e.target.dataset.listId
        saveAndRender();
    }
})
tasksContainer.addEventListener('click', e => {
    if(e.target.tagName.toLowerCase() === 'input'){
        const selectedList = lists.find(list => list.id === selectedListId)
        const selectedTask = selectedList.tasks.find(task => task.id  === e.target.id)
        selectedTask.complete = e.target.checked
        save();
        renderTaskCount(selectedList)
    }
})
clearCompleteTaskButton.addEventListener('click', e => {
    const selectedList = lists.find(list => list.id === selectedListId)
    selectedList.tasks = selectedList.tasks.filter(task =>  !task.complete)
    saveAndRender();
})

deleteListButton.addEventListener('click', e => {
    lists = lists.filter(list => list.id !== selectedListId)
    selectedListId = null;
    saveAndRender()
})
newListForm.addEventListener('submit', e => {
    e.preventDefault()
    //getting the name of the input
    const listName = newInputForm.value
    if(listName=== null || listName === "") return
    const list = createList(listName)
    newInputForm.value = null
    lists.push(list)
    saveAndRender();
})

newTaskForm.addEventListener('submit', e => {
    e.preventDefault()
    //getting the name of the input
    const taskName = newTaskInput.value
    if(taskName === null || taskName === "") return
    const task = createTask(taskName)
    newTaskInput.value = null
    const selectedList = lists.find(list => list.id === selectedListId)
    selectedList.tasks.push(task)
    saveAndRender();
})
function createList(name) {
    return {id: Date.now().toString(), name: name, tasks: [] }
}

function createTask(name) {
    return {id: Date.now().toString(), name: name, complete: false}
}
function saveAndRender () {
    save()
    render()
}

//to save this list in the local storage
function save () {
    localStorage.setItem(LOCAL_STORAGE_LIST_KEY, JSON.stringify(lists))
    localStorage.setItem(LOCAL_STORAGE_SELECETED_LIST_ID_KEY, selectedListId)

}
function render() {
    clearListContainer(listContainer)
   renderLists();

   const selectedList = lists.find(list => list.id === selectedListId)
   if(selectedListId == null){
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
        checkbox.id = task.id
        checkbox.checked = task.complete
        const label = taskElement.querySelector('label')
        label.htmlFor = task.id
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
        listElement.dataset.listId = list.id
        listElement.classList.add("list-name")
        listElement.innerHTML = list.name
        if(list.id === selectedListId){
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
render();
