let editingExpenseId=null;

function resetExpenseEditor(){
  editingExpenseId=null;$('#expense-form').reset();$('#expense-date').value=today();$('#expense-dialog-title').textContent='Add Expense';$('#save-expense').textContent='Save Expense';$('#expense-preview').classList.remove('show');$('#expense-preview').innerHTML='';
}

$('#add-expense').onclick=()=>{resetExpenseEditor();expenseDialog.showModal()};

function expensePreview(){
  const title=$('#expense-title').value.trim(),amount=+$('#expense-amount').value,date=$('#expense-date').value,category=$('#expense-new-category').value.trim()||$('#expense-category').value;
  if(!title)return toast('Expense title is required');if(amount<=0)return toast('Expense amount must be greater than zero');if(!date)return toast('Expense date is required');
  const box=$('#expense-preview');box.innerHTML=`<h3>Expense Preview</h3><p><span>Title</span><b>${escapeHtml(title)}</b></p><p><span>Category</span><b>${escapeHtml(category)}</b></p><p><span>Date</span><b>${date}</b></p><p><span>Notes</span><b>${escapeHtml($('#expense-notes').value||'-')}</b></p><p class="expense-preview-total"><span>Total Expense</span><b>${money(amount)}</b></p>`;box.classList.add('show');
}
$('#preview-expense').onclick=expensePreview;

$('#expense-form').addEventListener('submit',async e=>{
  e.preventDefault();e.stopImmediatePropagation();
  const title=$('#expense-title').value.trim(),amount=+$('#expense-amount').value,date=$('#expense-date').value;
  if(!title)return toast('Expense title is required');if(amount<=0)return toast('Expense amount must be greater than zero');if(!date)return toast('Expense date is required');
  const button=$('#save-expense');button.disabled=true;button.textContent=editingExpenseId?'Updating…':'Saving…';
  try{
    const categoryName=$('#expense-new-category').value.trim()||$('#expense-category').value;
    let category=expenseCategories.find(c=>c.name.toLowerCase()===categoryName.toLowerCase());
    if(!category)category=await api('/expense-categories/',{method:'POST',body:JSON.stringify({name:categoryName,description:'Manually added'})});
    const payload={title,category:category.id,amount:String(amount),expense_date:date,vendor:'',notes:$('#expense-notes').value};
    if($('#expense-ledger-account').value)payload.expense_account=+$('#expense-ledger-account').value;
    if($('#expense-payment-account').value)payload.payment_account=+$('#expense-payment-account').value;
    const wasEdit=Boolean(editingExpenseId);await api(wasEdit?`/expenses/${editingExpenseId}/`:'/expenses/',{method:wasEdit?'PUT':'POST',body:JSON.stringify(payload)});
    resetExpenseEditor();expenseDialog.close();await Promise.all([loadPhase23(),loadAccounting()]);toast(wasEdit?'Expense and accounting entry updated':'Expense and accounting entry saved');
  }catch(error){toast(error.message)}finally{button.disabled=false;if(editingExpenseId)button.textContent='Update Expense';else button.textContent='Save Expense'}
},true);

window.editExpense=id=>{
  const expense=expenses.find(x=>String(x.id)===String(id));if(!expense)return;
  resetExpenseEditor();editingExpenseId=expense.id;$('#expense-dialog-title').textContent='Edit Expense';$('#save-expense').textContent='Update Expense';$('#expense-title').value=expense.title;$('#expense-amount').value=expense.amount;$('#expense-date').value=expense.date;$('#expense-notes').value=expense.notes||'';
  const standard=[...$('#expense-category').options].some(o=>o.value.toLowerCase()===String(expense.category).toLowerCase());if(standard)$('#expense-category').value=expense.category;else{$('#expense-category').value='Other';$('#expense-new-category').value=expense.category}
  $('#expense-ledger-account').value=expense.expenseAccount||'';$('#expense-payment-account').value=expense.paymentAccount||'';expenseDialog.showModal();
};

window.deleteExpense=async id=>{
  const expense=expenses.find(x=>String(x.id)===String(id));if(!expense||!confirm(`Delete expense "${expense.title}"? Its accounting entry will also be removed.`))return;
  try{await api(`/expenses/${id}/`,{method:'DELETE'});await Promise.all([loadPhase23(),loadAccounting()]);toast('Expense deleted and reports updated')}catch(error){toast(error.message)}
};

renderExpenses=()=>{const total=expenses.reduce((a,e)=>a+e.amount,0);$('#expense-table').innerHTML=expenses.length?`<div class="panel-head"><span class="muted">Recorded expenses</span><strong>Total: ${money(total)}</strong></div><table><thead><tr><th>Date</th><th>Expense</th><th>Category</th><th>Notes</th><th>Amount</th><th>Actions</th></tr></thead><tbody>${expenses.map(e=>`<tr><td>${e.date}</td><td><strong>${escapeHtml(e.title)}</strong></td><td>${escapeHtml(e.category)}</td><td>${escapeHtml(e.notes||'—')}</td><td><strong>${money(e.amount)}</strong></td><td class="actions"><button onclick="editExpense('${e.id}')">Edit</button><button onclick="deleteExpense('${e.id}')">Delete</button></td></tr>`).join('')}</tbody></table>`:'<div style="padding:28px;text-align:center;color:#6c768b">No expenses recorded.</div>'};
