const queueTable=document.getElementById("queueTable");
async function loadQueue(){try{const r=await fetch(`${APPOINTMENT_API}/queue`);const queue=await r.json();queueTable.innerHTML="";
queue.forEach(a=>{const row=document.createElement("tr");row.innerHTML=`<td>${a.queueNumber}</td><td>${a.patientId}</td><td>${a.dentistId}</td><td>${a.appointmentTime}</td><td>${a.status}</td><td><button onclick="completeAppointment(${a.id})">Complete</button></td>`;queueTable.appendChild(row);});}catch(e){console.error(e);}}
async function completeAppointment(id){try{const r=await fetch(`${APPOINTMENT_API}/${id}/complete`,{method:"PUT"});if(!r.ok)throw new Error("Unable to update appointment.");loadQueue();}catch(e){alert(e.message);}}loadQueue();
