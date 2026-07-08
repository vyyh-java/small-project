
const GoalAPI = {
    //fetch
    async fetchAll() {
        const response = await fetch('/api/goals');
        if(!response.ok){
            const error = await response.json().catch(()=>({}));
            throw new Error(error.error || error.message || `HTTP error : ${response.status}`);
        }
        return await response.json();	
    },
    //insert
    async create(goalData) {
        const response = await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(goalData)
        });
        if(!response.ok){
            const error = await response.json().catch(()=>({}));
            throw new Error(error.error || error.message || `HTTP error : ${response.status}`);
        }
        return await response.json();
    },
    //update
    async update(id, updateData) {
        const response = await fetch(`/api/goals/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        if(!response.ok){
            const error = await response.json().catch(()=>({}));
            throw new Error(error.error || error.message || `HTTP error : ${response.status}`);
        }
        return await response.json();
    },
    //delete
    async delete(id) {
        const response = await fetch(`/api/goals/${id}`, { 
            method: 'DELETE' 
        });
        if(!response.ok){
            const error = await response.json().catch(()=>({}));
            throw new Error(error.error || error.message || `HTTP error : ${response.status}`);
        }
    },
};

const ProfileAPI = {
    async fetchProfile() {
        const response = await fetch('/profile');
        if(!response.ok){
            throw new Error(`HTTP error : ${response.status}`);
        }
        return await response.json();
    }
}

//goal data
/**
 *  Id
    Name
    Deadline
    Target
    Category
    Saved
*/
//profile
//userName
//joinDate

function dataHandle(str) {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let currentEditingId = null;
let currentMode = 'view'; // 'view', 'edit', 'add'
let goalsList = [];
let userProfile = {};

//overall
//calculating totolSaved
function calTotalSaved(goalsList){
    if (!goalsList || goalsList.length === 0) return 0;
    let sum = 0;
    goalsList.forEach(goal => {
        sum += parseFloat(goal.saved || 0); 
    });
    return sum;
}
//calculate dailysaved
function calDailySaved(goalsList){
    let sumSaved = calTotalSaved(goalsList);
    let sumDay = calTotalJoined();
    if(sumDay === 0) sumDay = 1;
    return sumSaved/sumDay;
}

function calTotalJoined(){
    if (!userProfile || !userProfile.joinDate) return 1;

    let join = new Date(userProfile.joinDate);
    if(isNaN(join.getTime())) return 1;

    let today = new Date();
    join.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const toDay = 24*3600*1000;
    return Math.floor((today-join)/toDay);
}
//calculate dailyrequired
function calTotalRequired(goalsList){
    if (!goalsList || goalsList.length === 0) return 0;
    const toDay = 24*3600*1000;
    let today = (new Date()).setHours(0,0,0,0);
    let totalRequired = 0 ;
    goalsList.forEach(goal => {
        let dayRequired = Math.ceil((new Date(goal.deadline).setHours(0,0,0,0) - today)/toDay);
        if(dayRequired <= 0) dayRequired = 1;
        let required = parseFloat(goal.target || 0 ) - parseFloat(goal.saved || 0);
        totalRequired += required/dayRequired;
    });
    return totalRequired;
}
//calculate overall completion
function calOverallCompletion(goalsList) {
    if (!goalsList || goalsList.length === 0) return 100;
    let totalTarget = 0;
    let totalSaved = 0;
    goalsList.forEach(goal => {
        totalTarget += parseFloat(goal.target || 0);
        totalSaved += parseFloat(goal.saved || 0);
    });
    if (totalTarget === 0) return 100;
    return (totalSaved / totalTarget) * 100;
}

//calculate urgentgoal
function countUrgentGoals(goalsList) {
    if (!goalsList || goalsList.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const toDay = 24*3600*1000;

    const urgentGoals = goalsList.filter(goal => {
        const inComplete = parseFloat(goal.saved || 0) < parseFloat(goal.target || 0);
        const deadline = new Date(goal.deadline);
        deadline.setHours(0, 0, 0, 0);
        const remaining = Math.ceil((deadline - today) / toDay);
        return inComplete && remaining <= 7;
    });
    return urgentGoals.length;
}
//each goals
//calculate goal-remaining
function calRemaining(goal){
    if (!goal || !goal.deadline) return 0;
    const toDay = 24*3600*1000;
    let deadline = new Date(goal.deadline || 0);
    let today = new Date();
    deadline.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    return Math.ceil((deadline-today)/toDay);
}

//calculate goal-required
function calRequired(goal){
    if(!goal) return 0;
    const target = parseFloat(goal.target || 0);
    const saved = parseFloat(goal.saved || 0);
    return Math.max(0,target-saved).toFixed(2);
}

//domcontent load
document.addEventListener('DOMContentLoaded', function () {
    //initialize all element/ui
    //analytic data
    const dailyRequired = document.querySelector('#daily-required');
    const dailySaved = document.querySelector('#daily-saved');
    const totalSaved = document.querySelector('#total-saved');
    const overallCompletion = document.querySelector('#overall-completion');
    const urgentGoals = document.querySelector('#urgent-goals');

    // modal-general-element
    const modal = document.querySelector('#goal-modal');
    const modalInstance = new bootstrap.Modal(modal);
    const modalTitle = document.querySelector('#goal-modal-title');
    const positiveBtn = document.querySelector('#right-button');
    const negativeBtn = document.querySelector('#left-button');
    const modalForm = document.querySelector('#goal-modal form');

    // editable-mode
    const goalName = document.querySelector('#goal-name');
    const goalDeadline = document.querySelector('#goal-deadline');
    const goalTarget = document.querySelector('#goal-target');
    const goalsCategory = document.querySelectorAll('input[name="category"]');
    const goalTypes = document.querySelectorAll('input[name="type"]');

    // view-data
    const viewable = document.querySelectorAll('.view-mode');
    const goalSaved = document.querySelector('#goal-saved');
    const goalRequired = document.querySelector('#goal-required');
    const goalRemaining = document.querySelector('#goal-remaining');

    // settings
    const manualForm = document.querySelector('#manual-form');
    const manualSavedBtn = manualForm.querySelector('#manual-saved-btn');
    
    //filter
    const filterContainer = document.querySelector('#filter-btn-container');


    //render analytic
    function renderAnalytic(goalsList){
        const totalRequiredValue = calTotalRequired(goalsList);
        const totalSavedValue = calTotalSaved(goalsList);
        const dailySavedValue = calDailySaved(goalsList);
        const completionValue = calOverallCompletion(goalsList);
        const urgentCount = countUrgentGoals(goalsList);
        dailyRequired.textContent = `RM ${totalRequiredValue.toFixed(2)}`;
        totalSaved.textContent = `RM ${totalSavedValue.toFixed(2)}`;
        dailySaved.textContent = `RM ${dailySavedValue.toFixed(2)}`;
        overallCompletion.textContent = `${completionValue.toFixed(1)}%`;
        urgentGoals.textContent = urgentCount;
    }

    //rending near-card, goal-card, urgent-list-item
    // goal-card
    function createGoalCard(goal) {
        const goalRemaining = calRemaining(goal);
        const container = document.querySelector('.goal-card-container');
        const isCompleted = parseFloat(goal.saved || 0) >= parseFloat(goal.target || 0);
        const isDue = new Date(goal.deadline).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
        let statusC = "";
        let statusD = "";
        if(isDue) statusD = '<span class="position-absolute top-0 end-0 p-2 m-2 negative border border-light rounded-circle"><span class="visually-hidden">Due alerts</span></span>';
        if(isCompleted) statusC = "style = 'background-color: #DDE0DF'";
        const cardHTML = `
            <div class="col col-12 col-lg-6 p-1 goal-card">
                <div class="card" 
                    data-id="${dataHandle(goal._id)}"
                    data-bs-target="#goal-modal" 
                    data-bs-toggle="modal" 
                    ${(isCompleted? statusC:"")}
                    >
                    ${(isDue? statusD: '')}
                    <div class="card-body">
                        <div class="row">
                            <div class="col-12 col-sm-2 my-2">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/icons/${dataHandle(goal.type)}-fill.svg" alt="" class="card-img mx-auto" style="aspect-ratio: 1/1; object-fit: contain; max-height: 32px;">
                            </div>
                            <div class="col-12 col-sm-10">
                                <h6 class="card-title">${dataHandle(goal.name)}</h6>
                                <p class="card-subtitle">${(isCompleted)? 'Completed' : (isDue)? 'Expired' : goalRemaining +' day'}</p>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col">
                                <div class="progress" role="progressbar">
                                    <div class="progress-bar ${dataHandle(goal.category)}" style="width: ${(Math.min(100,goal.saved*100/goal.target)).toFixed(2)}%"  max=100></div>
                                </div>
                                <p class="card-text text-end">RM ${goal.saved.toFixed(2)}/RM ${goal.target.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
			    </div> 
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    }
    
    // near-goal-card
    function createNearCard(goal) {
        const goalRemaining = calRemaining(goal);
        const container = document.querySelector('.near-card-container');
        const isDue = new Date(goal.deadline).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
        let status = "";
        if(isDue) status = '<span class="position-absolute top-0 end-0 p-2 m-2 negative border border-light rounded-circle"><span class="visually-hidden">Due alerts</span></span>';
        const cardHTML = `
            <div class="card border-0 shadow-sm near-card" 
                data-bs-target="#goal-modal" 
                data-bs-toggle="modal" 
                data-id="${dataHandle(goal._id)}"
                style="
                    overflow: hidden;
                    flex-grow: 0;
                    flex-shrink: 0;
                    border-radius: 20px;
                    aspect-ratio: 5/6;
                    height: 240px;
                    scroll-snap-align: center;
                    margin: 10px;">
                ${(isDue? status: '')}
                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/icons/${dataHandle(goal.type)}-fill.svg" alt="icon" class="card-img-top" style="object-fit: contain; height: 60%; width: auto; padding: 20%;">
                <div class="card-body text-start p-2 ${dataHandle(goal.category)}">
                    <h6 class="card-title">${dataHandle(goal.name)}</h6>
                    <p class="card-subtitle small">${(isDue)? 'Expired': goalRemaining+' days'}</p>
                    <p class="card-text">RM${goal.saved.toFixed(2)}/RM${goal.target.toFixed(2)}</p>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    
    }

    // urgent-list-item
    function createUrgentItem(goal) {
        const goalRemaining = calRemaining(goal);
        const container = document.querySelector('.urgent-list-container')
        const listHTML = `
            <li class="list-group-item d-flex justify-content-between align-items-center ${dataHandle(goal.category)}"
                data-bs-target="#goal-modal" 
                data-bs-toggle="modal" 
                data-id="${dataHandle(goal._id)}"
            >
                <span>${dataHandle(goal.name)}</span>
                <span class="badge rounded-pill text-bg-dark">
                    ${goalRemaining}d
                </span>
            </li>
        `;
        container.insertAdjacentHTML('beforeend',listHTML);
    }

    function renderAll(goalsList) {
        const containers = {
            analytic: document.querySelector('#analytic'),
            near: document.querySelector('.near-card-container'),
            goal: document.querySelector('.goal-card-container'),
            urgent: document.querySelector('.urgent-list-container')
        };
        
        if (containers.near) containers.near.innerHTML = '';
        if (containers.goal) containers.goal.innerHTML = '';
        if (containers.urgent) containers.urgent.innerHTML = '';
    
        renderAnalytic(goalsList);
    
        const inCompletedList = [...goalsList].filter(goal =>{
            const isCompleted = parseFloat(goal.saved || 0) >= parseFloat(goal.target || 0);
            return !isCompleted;
        });
        const activeList = [...inCompletedList].filter(goal =>{
            const isDue = new Date(goal.deadline).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
            return !isDue;
        });

        const sortByRequired = [...inCompletedList].sort((a, b) => {
            const aRequired = parseFloat(a.saved || 0)/parseFloat(a.target || 1);
            const bRequired = parseFloat(b.saved || 0)/parseFloat(b.target || 1);
            return bRequired - aRequired;
        });

        sortByRequired.slice(0, 5).forEach(goal => {
            createNearCard(goal);
        });

        activeList.forEach(goal=>{
            if (calRemaining(goal) <= 7) {
                createUrgentItem(goal);
            }
        });

        goalsList.forEach(goal => {
            createGoalCard(goal);
        });

        updateGoalSelection(inCompletedList);
    }
    //filter
    filterContainer.addEventListener('change', (e) => {
        const container = document.querySelector('.goal-card-container')
        if (container) container.innerHTML = '';
        if (e.target.name === 'goals-filter') {
            const selectedCategory = e.target.value;
            const filteredData = selectedCategory === 'all' ? goalsList : goalsList.filter(goal => goal.category === selectedCategory);
            filteredData.forEach(goal => {
                createGoalCard(goal);
            });
        }
    });

    //mode controller - modal : add, edit, view
    function renderModal(mode){
        switch(mode){
            case 'edit':{
                modalTitle.textContent = "Edit";
                positiveBtn.textContent = "Apply";
                negativeBtn.textContent = "Delete";

                //enable
                const editable = document.querySelectorAll(".editable");
                editable.forEach(el=>{
                    el.classList.remove("form-control-plaintext","w-auto","ms-2");
                    el.classList.add("form-control");
                    el.readOnly = false;
                })
                goalsCategory.forEach(radio => {
                    radio.disabled = false; 
                });
                goalTypes.forEach(radio =>{
                    radio.disabled = false;
                });

                //invisible
                viewable.forEach(el=>{
                    el.classList.add("d-none")
                })

                //visible
                const addons = document.querySelectorAll('.input-group-text');
                addons.forEach(el => el.classList.remove('d-none'));

                break;
            }
            case 'view':{
                modalTitle.textContent = "Details";
                positiveBtn.textContent = "Close";
                negativeBtn.textContent = "Edit";

                //invisible
                const addons = document.querySelectorAll('.input-group-text');
                addons.forEach(el => el.classList.add('d-none'));

                //disable
                const editable = document.querySelectorAll(".editable");
                editable.forEach(el=>{
                    el.classList.add("form-control-plaintext","w-auto","ms-2");
                    el.classList.remove("form-control");
                    el.readOnly = true;
                })
                goalsCategory.forEach(radio => {
                    radio.disabled = true; 
                });
                goalTypes.forEach(radio =>{
                    radio.disabled = true;
                });

                //visible
                viewable.forEach(el=>{
                    el.classList.remove("d-none")
                })

                break;
            }
            case 'add':{
                modalTitle.textContent = "Add Goal";
                positiveBtn.textContent = "Add";
                negativeBtn.textContent = "Cancel";
                
                modalForm.reset();

                //editable
                const editable = document.querySelectorAll(".editable");
                editable.forEach(el=>{
                    el.classList.remove("form-control-plaintext","w-auto","ms-2");
                    el.classList.add("form-control");
                    el.readOnly = false;
                })
                goalsCategory.forEach(radio => {
                    radio.disabled = false; 
                    radio.checked = false;
                });
                goalTypes.forEach(radio =>{
                    radio.disabled = false;
                    radio.checked = false;
                });

                //visible
                const addons = document.querySelectorAll('.input-group-text');
                addons.forEach(el => el.classList.remove('d-none'));

                //invisible
                viewable.forEach(el=>{
                    el.classList.add("d-none")
                })
                
                break;
            }
            default:{
                modal.hide();
                break;
            }
        }
    }
    function renderData(goal){
        goalName.value = goal.name;
        goalDeadline.value = goal.deadline;
        goalTarget.value = goal.target.toFixed(2);
        goalRemaining.value = calRemaining(goal) + ' day';
        goalRequired.value = calRequired(goal);
        goalSaved.value = goal.saved.toFixed(2);
        goalsCategory.forEach(radio=>{
            if(radio.value === goal.category){
                radio.checked = true;
            }
            else{
                radio.checked = false;
            }
        })
        goalTypes.forEach(radio=>{
            if(radio.value === goal.type){
                radio.checked = true;
            }
            else{
                radio.checked = false;
            }
        });
    }

    modal.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget; 
        
        if (button.classList.contains('btn-add')) {
            modeController('add');
        } else {
            const goalId = button.getAttribute('data-id');
            modeController('view', goalId);
        }
    });

    negativeBtn.addEventListener('click', async function() {
        if (currentMode === 'view') {
            modeController('edit'); 
        } else if (currentMode === 'edit') {
            //delete gaol
            if(confirm("Are you sure?")){
                try {
                    negativeBtn.disabled = true;
                    await GoalAPI.delete(currentEditingId);
                    goalsList = goalsList.filter(g => String(g._id) !== String(currentEditingId))
                    //goalsList = await GoalAPI.fetchAll();
                    renderAll(goalsList);
                    modalInstance.hide();
                } catch (error) {
                    alert("Failed");
                    console.error("Failed to delete data:",error);
                }finally{
                    negativeBtn.disabled = false;
                }
            }
        } else if(currentMode === 'add'){
            modalInstance.hide();
        }
    });

    positiveBtn.addEventListener('click', async function(){
        if (currentMode === 'view') {
            modalInstance.hide();
        } else {
            const newData = getGoalData();
            if(!newData) return;
            try {
                positiveBtn.disabled = true;
                if(currentMode === 'edit'){
                    const result = await GoalAPI.update(currentEditingId, newData);
                    const index = goalsList.findIndex(g => String(g._id) === String(currentEditingId));
                    goalsList[index] = result.data;
                }
                if(currentMode === 'add'){
                    const result = await GoalAPI.create({ ...newData, saved: 0 });
                    goalsList.push(result.data);
                }
                //goalsList = await GoalAPI.fetchAll();
                renderAll(goalsList);
                modalInstance.hide();
            } catch (error) {
                alert("Failed:"+error.message);
                console.error("Failed to update data:",error);
            }finally{
                positiveBtn.disabled = false;
            }

        } 
    });



    function modeController(mode, goalId=null){
        
        currentMode = mode;

        if (mode === 'add') {
            currentEditingId = null; //reset
        } else if (goalId !== null) {
            currentEditingId = goalId; //set
        }

        let goal = goalsList.find(g => String(g._id) === String(currentEditingId));

        switch(mode){
            case 'add':{
                renderModal('add');
                break;
            }
            case 'view':{
                renderModal('view');
                if (goal) {
                    renderData(goal);
                }
                break;
            }
            case 'edit':{
                renderModal('edit');
                if (goal) {
                    renderData(goal);
                }
                break;
            }
            default:{
                modalInstance.hide();
                break;
            }
        }
    }

    function getGoalData() {
        const name = document.querySelector('#goal-name').value.trim();
        const deadline = document.querySelector('#goal-deadline').value;
        const target = parseFloat(document.querySelector('#goal-target').value);
        const category = document.querySelector('input[name="category"]:checked');
        const type = document.querySelector('input[name="type"]:checked');

        if(name !== "" && deadline !== "" && target > 0 && !isNaN(target) && category !== null && type !== null){
            return {
                name,
                deadline,
                target,
                category : category.value,
                type : type.value
            };
        }else{
            alert("Invalid Data");
        }
    }
    

    //setting controller - offcanvas

    function updateGoalSelection(goalsList) {
        const container = document.querySelector('.goals-option-container');
        if (!container) return;
    
        container.innerHTML = '<option selected disabled>Select a goal</option>';
    
        goalsList.forEach(goal => {
            const optionHTML = `<option value="${dataHandle(goal._id)}">${dataHandle(goal.name)} need ${calRequired(goal)}</option>`;
            container.insertAdjacentHTML('beforeend', optionHTML);
        });
    }
    
    manualSavedBtn.addEventListener('click',async function(event){
        event.preventDefault(); 
        //get
        const container = manualForm.querySelector('.goals-option-container');
        const selectedId = container.value;
        const budgetContainer = manualForm.querySelector('#goal-target-manual');
        const budget = parseFloat(budgetContainer.value);
        //validate
        if(isNaN(budget) || !(selectedId) || budget<0){
            alert('Invalid Input!')
        }else{
            try{
                manualSavedBtn.disabled = true;
                const index = goalsList.findIndex(g => String(g._id) === String(selectedId));
                if(index !== -1){
                    const final = Math.min(goalsList[index].target,goalsList[index].saved+budget);
                    if(final >= goalsList[index].target){
                        alert('Goal completed!');
                    }
                    const result = await GoalAPI.update(selectedId,{saved: final});
                    if(result){
                        goalsList[index] = result.data;
                    }
                }
                //goalsList = await GoalAPI.fetchAll();
                renderAll(goalsList);
            }catch(error){
                alert("Failed to save changes!"+error.message);
                console.error("Failed to save:", error);
            }finally{
                manualSavedBtn.disabled = false;
            }
        }
        manualForm.reset();
    });

    async function initialize() {
        try {
            const [goalData,userData] = await Promise.all([GoalAPI.fetchAll(),ProfileAPI.fetchProfile()]);
            goalsList = goalData;
            userProfile = userData;
            renderAll(goalsList);
            
        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    }

    initialize();
});
