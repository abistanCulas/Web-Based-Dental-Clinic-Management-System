const reminderList=document.getElementById("reminderList");
async function loadReminders(){try{const r=await fetch(`${APPOINTMENT_API}/upcoming`);const items=await r.json();reminderList.innerHTML="";
if(items.length===0){reminderList.innerHTML="<p>No upcoming appointments.</p>";return;}
items.forEach(a=>{const card=document.createElement("div");card.className="card";card.innerHTML=`<h3>Appointment #${a.id}</h3><p><strong>Patient:</strong> ${a.patientId}</p><p><strong>Dentist:</strong> ${a.dentistId}</p><p><strong>Date:</strong> ${a.appointmentDate}</p><p><strong>Time:</strong> ${a.appointmentTime}</p><p><strong>Status:</strong> ${a.status}</p>`;reminderList.appendChild(card);});}
catch(e){reminderList.innerHTML="<p>Unable to load reminders.</p>";}}loadReminders();
